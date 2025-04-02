document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const dialectSelect = document.getElementById('dialect');
    const copyButton = document.getElementById('copyText');
    const downloadButton = document.getElementById('downloadText');
    const clearButton = document.getElementById('clearText');
    const continuousCheckbox = document.getElementById('continuousRecording');
    const autoPunctuationCheckbox = document.getElementById('autoPunctuation');
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    const confidenceValue = document.getElementById('confidenceValue');
    const themeSwitch = document.getElementById('theme-switch');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const notificationClose = document.getElementById('notificationClose');

    // Speech recognition setup
    let recognition = null;
    let isRecording = false;
    let transcript = '';
    let confidence = 0;
    
    // Initialize WebSpeech API
    const initSpeechRecognition = () => {
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showNotification('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند. لطفاً از Chrome یا Edge استفاده کنید.');
            startButton.disabled = true;
            return false;
        }
        
        // Create speech recognition instance
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        
        // Configure recognition
        recognition.continuous = continuousCheckbox.checked;
        recognition.interimResults = true;
        recognition.lang = 'fa-IR'; // Persian language
        
        // Event handlers
        recognition.onstart = () => {
            isRecording = true;
            updateUI();
        };
        
        recognition.onend = () => {
            isRecording = false;
            if (continuousCheckbox.checked && startButton.disabled) {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('Error restarting recognition:', error);
                    isRecording = false;
                    updateUI();
                }
            } else {
                updateUI();
            }
        };
        
        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                confidence = result[0].confidence * 100;
                
                if (confidence < confidenceThreshold.value) {
                    continue; // Skip low confidence results
                }
                
                if (result.isFinal) {
                    let text = result[0].transcript;
                    
                    // Apply auto-punctuation if enabled
                    if (autoPunctuationCheckbox.checked) {
                        text = applyAutoPunctuation(text);
                    }
                    
                    finalTranscript += text + ' ';
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
            
            if (finalTranscript) {
                transcript += finalTranscript;
                transcriptionOutput.textContent = transcript;
            }
            
            if (interimTranscript) {
                transcriptionOutput.textContent = transcript + ' ' + interimTranscript;
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            if (event.error === 'no-speech') {
                showNotification('صدایی شنیده نشد. لطفاً بلندتر صحبت کنید.');
            } else if (event.error === 'audio-capture') {
                showNotification('میکروفونی پیدا نشد. لطفاً میکروفون خود را بررسی کنید.');
                stopRecording();
            } else if (event.error === 'not-allowed') {
                showNotification('اجازه استفاده از میکروفون داده نشد.');
                stopRecording();
            } else {
                showNotification(`خطا: ${event.error}`);
            }
        };
        
        return true;
    };
    
    // Apply basic auto-punctuation rules
    const applyAutoPunctuation = (text) => {
        // This is a simplified version - in a production app, you'd use a more
        // sophisticated NLP approach or a dedicated API
        
        // Add period at the end if needed
        if (!text.match(/[\.\?\!]$/)) {
            text += '.';
        }
        
        // Capitalize first letter of sentences
        text = text.replace(/(?<=^|[\.\?\!]\s+)[a-z]/g, match => match.toUpperCase());
        
        return text;
    };
    
    // Start recording
    const startRecording = async () => {
        if (!recognition && !initSpeechRecognition()) {
            return;
        }
        
        // Check if we already have permission
        const hasPermission = localStorage.getItem('microphonePermission') === 'granted';
        
        if (!hasPermission) {
            try {
                // Request microphone permission
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Store permission status
                localStorage.setItem('microphonePermission', 'granted');
                // Stop the stream as we don't need it anymore
                stream.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.error('Microphone permission denied:', error);
                localStorage.setItem('microphonePermission', 'denied');
                showNotification('لطفاً اجازه دسترسی به میکروفن را بدهید تا بتوانید از سرویس تبدیل گفتار به متن استفاده کنید.');
                return;
            }
        }
        
        // Update recognition settings
        recognition.continuous = continuousCheckbox.checked;
        recognition.lang = 'fa-IR';
        
        try {
            recognition.start();
            statusText.textContent = 'در حال ضبط...';
            statusDot.classList.add('recording');
            startButton.disabled = true;
            stopButton.disabled = false;
        } catch (error) {
            console.error('Error starting recognition:', error);
            showNotification('خطا در شروع ضبط. لطفاً دوباره تلاش کنید.');
        }
    };
    
    // Stop recording
    const stopRecording = () => {
        if (recognition) {
            try {
                recognition.stop();
                statusText.textContent = 'آماده برای ضبط';
                statusDot.classList.remove('recording');
                startButton.disabled = false;
                stopButton.disabled = true;
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }
    };
    
    // Update UI based on recording state
    const updateUI = () => {
        if (isRecording) {
            statusText.textContent = 'در حال ضبط...';
            statusDot.classList.add('recording');
            startButton.disabled = true;
            stopButton.disabled = false;
        } else {
            statusText.textContent = 'آماده برای ضبط';
            statusDot.classList.remove('recording');
            startButton.disabled = false;
            stopButton.disabled = true;
        }
    };
    
    // Copy transcription to clipboard
    const copyToClipboard = () => {
        if (!transcriptionOutput.textContent) {
            showNotification('متنی برای کپی کردن وجود ندارد.');
            return;
        }
        
        navigator.clipboard.writeText(transcriptionOutput.textContent)
            .then(() => {
                showNotification('متن با موفقیت کپی شد.');
            })
            .catch(() => {
                showNotification('خطا در کپی متن. لطفاً دوباره تلاش کنید.');
            });
    };
    
    // Download transcription as a text file
    const downloadTranscription = () => {
        if (!transcriptionOutput.textContent) {
            showNotification('متنی برای دانلود وجود ندارد.');
            return;
        }
        
        const text = transcriptionOutput.textContent;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showNotification('متن با موفقیت دانلود شد.');
    };
    
    // Clear transcription
    const clearTranscription = () => {
        if (!transcriptionOutput.textContent) {
            return;
        }
        
        if (confirm('آیا مطمئن هستید که می‌خواهید متن را پاک کنید؟')) {
            transcriptionOutput.textContent = '';
            transcript = '';
            showNotification('متن پاک شد.');
        }
    };
    
    // Show notification
    const showNotification = (message) => {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };
    
    // Toggle theme
    const toggleTheme = () => {
        if (themeSwitch.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    };
    
    // Update confidence threshold value display
    const updateConfidenceValueDisplay = () => {
        confidenceValue.textContent = `${confidenceThreshold.value}%`;
    };
    
    // Initialize
    const init = () => {
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registration successful');
                    })
                    .catch(err => {
                        console.log('ServiceWorker registration failed: ', err);
                    });
            });
        }

        // Initialize speech recognition
        initSpeechRecognition();
        
        // Set up event listeners
        startButton.addEventListener('click', startRecording);
        stopButton.addEventListener('click', stopRecording);
        copyButton.addEventListener('click', copyToClipboard);
        downloadButton.addEventListener('click', downloadTranscription);
        clearButton.addEventListener('click', clearTranscription);
        themeSwitch.addEventListener('change', toggleTheme);
        confidenceThreshold.addEventListener('input', updateConfidenceValueDisplay);
        notificationClose.addEventListener('click', () => notification.classList.remove('show'));
        
        // Check saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            themeSwitch.checked = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // Create placeholder text
        transcriptionOutput.textContent = 'روی دکمه شروع ضبط کلیک کنید و صحبت کنید...';
    };
    
    init();
}); 