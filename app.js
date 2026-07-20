const App = {
    currentAudio: null,
    audioContext: null,
    analyser: null,
    animationId: null,
    chatMessages: [],
    sessionTexts: [],
    lastCorrection: null,

    init() {
        this.setupUserAuth();
        this.setupNavigation();
        this.setupTalkingPage();
        this.setupListeningPage();
        this.setupDetailsPage();
        this.setupRecordsPage();
        this.loadApiKey();
    },

    setupUserAuth() {
        const userIcon = document.getElementById('user-icon');
        const userDropdown = document.getElementById('user-dropdown');
        const authModal = document.getElementById('auth-modal');
        const logoutBtn = document.getElementById('logout-btn');
        const showLoginBtn = document.getElementById('show-login-btn');
        const showRegisterBtn = document.getElementById('show-register-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const loginSubmitBtn = document.getElementById('login-submit-btn');
        const registerSubmitBtn = document.getElementById('register-submit-btn');
        const loginError = document.getElementById('login-error');
        const registerError = document.getElementById('register-error');
        const registerSuccess = document.getElementById('register-success');

        const currentUser = Storage.getCurrentUser();
        if (currentUser) {
            this.updateUserDisplay(currentUser);
            userIcon.textContent = currentUser.username.charAt(0).toUpperCase();
        } else {
            authModal.classList.remove('hidden');
        }

        userIcon.addEventListener('click', () => {
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show');
            }
        });

        logoutBtn.addEventListener('click', () => {
            Storage.logoutUser();
            userDropdown.classList.remove('show');
            userIcon.textContent = '👤';
            authModal.classList.remove('hidden');
            this.resetLoginForm();
            this.resetRegisterForm();
        });

        showLoginBtn.addEventListener('click', () => {
            loginForm.hidden = false;
            registerForm.hidden = true;
            showLoginBtn.classList.add('active');
            showRegisterBtn.classList.remove('active');
            this.resetLoginForm();
            this.resetRegisterForm();
        });

        showRegisterBtn.addEventListener('click', () => {
            registerForm.hidden = false;
            loginForm.hidden = true;
            showRegisterBtn.classList.add('active');
            showLoginBtn.classList.remove('active');
            this.resetLoginForm();
            this.resetRegisterForm();
        });

        loginSubmitBtn.addEventListener('click', () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!username || !password) {
                loginError.textContent = 'Please fill in all fields';
                loginError.hidden = false;
                return;
            }

            try {
                const user = Storage.loginUser(username, password);
                Storage.setCurrentUser(user);
                this.updateUserDisplay(user);
                userIcon.textContent = user.username.charAt(0).toUpperCase();
                authModal.classList.add('hidden');
                userDropdown.classList.remove('show');
            } catch (error) {
                loginError.textContent = error.message;
                loginError.hidden = false;
            }
        });

        registerSubmitBtn.addEventListener('click', () => {
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            
            if (!username || !email || !password) {
                registerError.textContent = 'Please fill in all fields';
                registerError.hidden = false;
                return;
            }

            try {
                const user = Storage.registerUser(username, email, password);
                registerSuccess.textContent = 'Registration successful! Please login.';
                registerSuccess.hidden = false;
                registerError.hidden = true;
                
                setTimeout(() => {
                    showLoginBtn.click();
                    document.getElementById('login-username').value = username;
                }, 1500);
            } catch (error) {
                registerError.textContent = error.message;
                registerError.hidden = false;
                registerSuccess.hidden = true;
            }
        });
    },

    updateUserDisplay(user) {
        document.getElementById('dropdown-username').textContent = user.username;
        document.getElementById('dropdown-email').textContent = user.email;
    },

    resetLoginForm() {
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').hidden = true;
    },

    resetRegisterForm() {
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-error').hidden = true;
        document.getElementById('register-success').hidden = true;
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pages = document.querySelectorAll('.page');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const pageName = item.dataset.page;

                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                pages.forEach(page => page.classList.remove('active'));
                document.getElementById(`${pageName}-page`).classList.add('active');

                if (pageName === 'records') {
                    this.updateRecordsPage();
                    this.setupRecordsFilters();
                }
                
                if (pageName === 'listening') {
                    this.loadLastSessionToListening();
                }
            });
        });
    },

    setupRecordsFilters() {
        document.querySelectorAll('.filter-bar').forEach(bar => {
            bar.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        });
    },

    setupTalkingPage() {
        const uploadArea = document.getElementById('upload-area');
        const imageInput = document.getElementById('image-input');
        const imagePreview = document.getElementById('image-preview');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const analyzeBtn = document.getElementById('analyze-btn');
        const finishSessionBtn = document.getElementById('finish-session-btn');

        uploadArea.addEventListener('click', () => {
            imageInput.click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = 'var(--border-color)';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--border-color)';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file, imagePreview, uploadArea);
            }
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleImageUpload(e.target.files[0], imagePreview, uploadArea);
            }
        });

        sendBtn.addEventListener('click', async () => {
            await this.sendChatMessage();
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });

        analyzeBtn.addEventListener('click', async () => {
            await this.analyzeAndCorrect();
        });

        finishSessionBtn.addEventListener('click', () => {
            this.finishSession();
        });
    },

    handleImageUpload(file, imagePreview, uploadArea) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.hidden = false;
            uploadArea.querySelector('.upload-placeholder').hidden = true;
        };
        reader.readAsDataURL(file);
    },

    async sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        const imagePreview = document.getElementById('image-preview');
        
        if (!message) return;

        chatInput.value = '';
        this.addUserMessage(message);
        this.sessionTexts.push(message);

        document.getElementById('analyze-btn').disabled = false;
        document.getElementById('finish-session-btn').disabled = false;

        try {
            const loadingId = this.addAIMessage('Thinking...');
            const response = await AI.chatWithAI(message, false, null);
            this.updateAIMessage(loadingId, response.reply);
        } catch (error) {
            console.error('Chat error:', error);
            this.addAIMessage(error.message);
        }
    },

    async analyzeAndCorrect() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const imagePreview = document.getElementById('image-preview');
        
        if (this.sessionTexts.length === 0) {
            this.addAIMessage('⚠️ 请先输入一些描述内容');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';

        try {
            this.addAIMessage('🔍 正在分析图片内容...');
            
            const imageData = !imagePreview.hidden ? imagePreview.src : null;
            const userInputs = this.sessionTexts;
            const correction = await AI.chatWithAI(userInputs, true, imageData);

            this.addAIMessage('📝 正在整合您的输入内容...');
            
            if (correction.imageDescription) {
                this.addAIMessage(`🖼️ 图片内容描述：\n${correction.imageDescription}`);
            }

            this.addCorrectionSummary(correction);

            this.lastCorrection = correction;

            this.addAIMessage('💾 正在保存到听力页面...');
            this.saveToListening(correction);

            this.addAIMessage('📚 正在生成闪卡...');
            this.autoAddChunksToFlashcards(correction);

            this.addAIMessage('✅ 分析完成！您可以：\n1. 前往听力页面进行跟读练习\n2. 查看闪卡复习语块\n3. 继续添加更多描述');

            analyzeBtn.textContent = 'Analysis Complete!';
            setTimeout(() => {
                analyzeBtn.textContent = 'Analyze & Correct';
                analyzeBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Analysis error:', error);
            this.addAIMessage(`❌ 分析失败：${error.message}`);
            analyzeBtn.textContent = 'Retry';
            analyzeBtn.disabled = false;
        }
    },

    finishSession() {
        const fullText = this.sessionTexts.join(' ');
        const correction = this.lastCorrection;

        if (!fullText) {
            alert('Please type something first!');
            return;
        }

        const session = {
            date: new Date().toISOString(),
            duration: this.sessionTexts.length,
            transcript: fullText,
            corrected: correction ? correction.corrected : fullText,
            errors: correction ? correction.errors : [],
            chunks: correction ? correction.chunks : [],
            image: document.getElementById('image-preview').src || ''
        };

        Storage.saveRecord(session);

        if (correction && correction.errors && correction.errors.length > 0) {
            FlashcardManager.generateFromErrors(correction.errors);
        }

        if (correction && correction.chunks && correction.chunks.length > 0) {
            FlashcardManager.generateFromChunks(correction.chunks);
        }

        this.addAIMessage('Great practice session! Your progress has been saved. Check the Listening, Details, and Records pages to review.');

        this.sessionTexts = [];
        this.lastCorrection = null;
        AI.resetConversation();

        document.getElementById('analyze-btn').disabled = true;
        document.getElementById('finish-session-btn').disabled = true;
    },

    addUserMessage(text) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        messageDiv.innerHTML = `<div class="chat-bubble"><p>${this.escapeHtml(text)}</p></div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    addAIMessage(text) {
        const chatMessages = document.getElementById('chat-messages');
        const id = 'ai-msg-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ai-message';
        messageDiv.id = id;
        messageDiv.innerHTML = `<div class="chat-bubble"><p>${text}</p></div>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    },

    updateAIMessage(id, text) {
        const messageDiv = document.getElementById(id);
        if (messageDiv) {
            messageDiv.querySelector('.chat-bubble p').textContent = text;
        }
    },

    addCorrectionSummary(correction) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message ai-message';
        
        let imageDescHtml = '';
        if (correction.imageDescription) {
            imageDescHtml = `<div class="image-description"><h4>🖼️ 图片内容描述</h4><p>${correction.imageDescription}</p></div>`;
        }

        let errorsHtml = '';
        if (correction.errors && correction.errors.length > 0) {
            errorsHtml = '<div class="correction-details"><h4>✏️ 修改详情</h4><ul>' +
                correction.errors.map(e => `<li><span class="error-word">${e.original}</span> → <span class="correct-word">${e.correction}</span><br><small>${e.explanation}</small></li>`).join('') +
                '</ul></div>';
        }

        let chunksHtml = '';
        if (correction.chunks && correction.chunks.length > 0) {
            chunksHtml = '<div class="chunks-details"><h4>📚 提取的语块</h4><ul>' +
                correction.chunks.map(c => `<li><span class="chunk-tag">${c}</span></li>`).join('') +
                '</ul></div>';
        }

        messageDiv.innerHTML = `
            <div class="chat-bubble correction-summary">
                ${imageDescHtml}
                <div class="final-correction"><h4>✨ 综合润色后文本</h4><p class="correct-word">${correction.corrected}</p></div>
                ${errorsHtml}
                ${chunksHtml}
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    saveToListening(correction) {
        const session = {
            date: new Date().toISOString(),
            duration: this.sessionTexts.length,
            transcript: this.sessionTexts.join(' '),
            corrected: correction.corrected,
            errors: correction.errors || [],
            chunks: correction.chunks || [],
            image: document.getElementById('image-preview').src || ''
        };

        Storage.saveRecord(session);
        this.lastSavedSession = session;

        this.addAIMessage('✅ 已保存到听力页面，可播放跟读');
    },

    autoAddChunksToFlashcards(correction) {
        if (correction.chunks && correction.chunks.length > 0) {
            FlashcardManager.generateFromChunks(correction.chunks);
            this.addAIMessage(`📚 已添加 ${correction.chunks.length} 个语块到单词卡`);
        }

        if (correction.errors && correction.errors.length > 0) {
            FlashcardManager.generateFromErrors(correction.errors);
        }
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    setupListeningPage() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopAudioBtn = document.getElementById('stop-audio-btn');
        const speedSelect = document.getElementById('speed-select');
        const loopCheckbox = document.getElementById('loop-checkbox');
        const generateAudioBtn = document.getElementById('generate-audio-btn');

        this.loadLastSessionToListening();

        this.isSpeaking = false;
        this.isPaused = false;
        this.loopEnabled = false;

        generateAudioBtn.addEventListener('click', async () => {
            await this.playListeningAudio();
        });

        playBtn.addEventListener('click', () => {
            if (this.isPaused) {
                AI.resumeSpeaking();
                this.isPaused = false;
                playBtn.disabled = true;
                pauseBtn.disabled = false;
            } else {
                this.playListeningAudio();
            }
        });

        pauseBtn.addEventListener('click', () => {
            AI.pauseSpeaking();
            this.isPaused = true;
            playBtn.disabled = false;
            pauseBtn.disabled = true;
        });

        stopAudioBtn.addEventListener('click', () => {
            AI.stopSpeaking();
            this.isSpeaking = false;
            this.isPaused = false;
            playBtn.disabled = false;
            pauseBtn.disabled = true;
        });

        speedSelect.addEventListener('change', () => {
            this.currentSpeed = parseFloat(speedSelect.value);
        });

        loopCheckbox.addEventListener('change', () => {
            this.loopEnabled = loopCheckbox.checked;
        });
    },

    loadLastSessionToListening() {
        const practiceText = document.getElementById('practice-text');
        const lastSession = Storage.getLastSession();
        
        if (lastSession && lastSession.corrected) {
            const words = lastSession.corrected.split(/\s+/);
            let html = '<p class="listening-paragraph">';
            html += words.map((word, index) => 
                `<span class="word" data-index="${index}" data-word="${this.escapeHtml(word)}">${this.escapeHtml(word)}</span>`
            ).join(' ');
            html += '</p>';
            
            if (lastSession.errors && lastSession.errors.length > 0) {
                html += '<div class="correction-details"><h4>Corrections:</h4><ul>' +
                    lastSession.errors.map(e => `<li><span class="error-word">${e.original}</span> → <span class="correct-word">${e.correction}</span><br><small>${e.explanation}</small></li>`).join('') +
                    '</ul></div>';
            }
            
            if (lastSession.chunks && lastSession.chunks.length > 0) {
                html += '<div class="chunks-details"><h4>Chunks:</h4><ul>' +
                    lastSession.chunks.map(c => `<li><span class="chunk-tag">${c}</span></li>`).join('') +
                    '</ul></div>';
            }
            
            practiceText.innerHTML = html;
        }
    },

    async playListeningAudio() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const generateBtn = document.getElementById('generate-audio-btn');

        const lastSession = Storage.getLastSession();
        if (!lastSession || !lastSession.corrected) {
            document.getElementById('practice-text').innerHTML = '<p class="placeholder">No session data available. Complete a writing session first.</p>';
            return;
        }

        if (this.isSpeaking) {
            AI.stopSpeaking();
            this.isSpeaking = false;
            playBtn.disabled = false;
            pauseBtn.disabled = true;
            this.clearWordHighlight();
            return;
        }

        playBtn.disabled = true;
        pauseBtn.disabled = false;
        this.isSpeaking = true;
        this.isPaused = false;

        const text = lastSession.corrected;
        const words = text.split(/\s+/);
        let currentWordIndex = 0;

        const highlightWord = (charIndex, charLength) => {
            this.clearWordHighlight();
            
            let accumulatedLength = 0;
            for (let i = 0; i < words.length; i++) {
                const wordLength = words[i].length + 1;
                if (charIndex >= accumulatedLength && charIndex < accumulatedLength + wordLength) {
                    currentWordIndex = i;
                    break;
                }
                accumulatedLength += wordLength;
            }

            const wordElements = document.querySelectorAll('.text-display-new .word');
            wordElements.forEach((el, index) => {
                if (index < currentWordIndex) {
                    el.classList.add('spoken');
                    el.classList.remove('active');
                } else if (index === currentWordIndex) {
                    el.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        };

        const doSpeak = async () => {
            try {
                await AI.speakText(text, { 
                    rate: this.currentSpeed || 1,
                    onWordBoundary: highlightWord
                });
                
                if (this.loopEnabled && this.isSpeaking) {
                    this.clearWordHighlight();
                    doSpeak();
                } else {
                    this.isSpeaking = false;
                    this.isPaused = false;
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                    this.clearWordHighlight();
                }
            } catch (error) {
                console.error('Speech error:', error);
                this.isSpeaking = false;
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                this.clearWordHighlight();
            }
        };

        doSpeak();
    },

    clearWordHighlight() {
        const wordElements = document.querySelectorAll('.text-display-new .word');
        wordElements.forEach(el => {
            el.classList.remove('active');
        });
    },

    startWaveformVisualization() {
        const canvas = document.getElementById('waveform-canvas');
        const ctx = canvas.getContext('2d');

        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            const source = this.audioContext.createMediaElementSource(this.currentAudio);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            this.analyser.fftSize = 256;
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const draw = () => {
            this.animationId = requestAnimationFrame(draw);

            this.analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgb(248, 250, 252)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                ctx.fillStyle = `rgb(${barHeight + 79}, 70, 229)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();
    },

    stopWaveformVisualization() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    },

    setupDetailsPage() {
        const generateFlashcardsBtn = document.getElementById('generate-flashcards-btn');
        const prevCardBtn = document.getElementById('prev-card-btn');
        const nextCardBtn = document.getElementById('next-card-btn');
        const flashcard = document.getElementById('current-flashcard');
        const startAiQuizBtn = document.getElementById('start-ai-quiz-btn');

        FlashcardManager.loadFromStorage();
        this.updateFlashcardDisplay();

        generateFlashcardsBtn.addEventListener('click', async () => {
            await this.generateFlashcardsFromSession();
        });

        flashcard.addEventListener('click', () => {
            FlashcardManager.flipCard();
            flashcard.classList.toggle('flipped');
        });

        prevCardBtn.addEventListener('click', () => {
            FlashcardManager.prevCard();
            this.updateFlashcardDisplay();
        });

        nextCardBtn.addEventListener('click', () => {
            FlashcardManager.nextCard();
            this.updateFlashcardDisplay();
        });

        startAiQuizBtn.addEventListener('click', () => {
            this.startAiQuiz();
        });
    },

    async generateFlashcardsFromSession() {
        const lastSession = Storage.getLastSession();
        if (!lastSession) {
            alert('No session data available');
            return;
        }

        if (lastSession.errors && lastSession.errors.length > 0) {
            await FlashcardManager.generateFromErrors(lastSession.errors);
            this.updateFlashcardDisplay();
        }

        if (lastSession.chunks && lastSession.chunks.length > 0) {
            await FlashcardManager.generateFromChunks(lastSession.chunks);
            this.updateFlashcardDisplay();
        }
    },

    updateFlashcardDisplay() {
        const card = FlashcardManager.getCurrentCard();
        const flashcard = document.getElementById('current-flashcard');
        const cardCounter = document.getElementById('card-counter');
        const prevBtn = document.getElementById('prev-card-btn');
        const nextBtn = document.getElementById('next-card-btn');
        const phoneticEl = flashcard.querySelector('.flashcard-phonetic');
        const posEl = flashcard.querySelector('.flashcard-pos');

        if (card) {
            flashcard.querySelector('.flashcard-word').textContent = card.word;
            flashcard.querySelector('.flashcard-meaning').textContent = card.meaning;
            flashcard.querySelector('.flashcard-example').textContent = card.example;

            if (card.phonetic) {
                phoneticEl.textContent = card.phonetic;
                phoneticEl.style.display = 'block';
            } else {
                phoneticEl.style.display = 'none';
            }

            if (card.partOfSpeech) {
                posEl.textContent = card.partOfSpeech;
                posEl.style.display = 'block';
            } else {
                posEl.style.display = 'none';
            }

            cardCounter.textContent = `${FlashcardManager.currentIndex + 1} / ${FlashcardManager.getTotalCount()}`;
            prevBtn.disabled = FlashcardManager.currentIndex === 0;
            nextBtn.disabled = FlashcardManager.currentIndex === FlashcardManager.getTotalCount() - 1;
        } else {
            flashcard.querySelector('.flashcard-word').textContent = 'No cards';
            flashcard.querySelector('.flashcard-meaning').textContent = 'Generate flashcards from your session';
            flashcard.querySelector('.flashcard-example').textContent = '';
            phoneticEl.style.display = 'none';
            posEl.style.display = 'none';
            cardCounter.textContent = '0 / 0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        }

        flashcard.classList.remove('flipped');
        FlashcardManager.isFlipped = false;

        this.updateErrorsAndChunks();
    },

    updateErrorsAndChunks() {
        const lastSession = Storage.getLastSession();
        if (!lastSession) return;

        const errorsList = document.getElementById('errors-list');
        const chunksList = document.getElementById('chunks-list');

        if (lastSession.errors && lastSession.errors.length > 0) {
            errorsList.innerHTML = lastSession.errors.map(error => `
                <div class="error-item">
                    <p><span class="error-original">${error.original}</span> → <span class="error-corrected">${error.correction}</span></p>
                    <p class="error-explanation">${error.explanation}</p>
                </div>
            `).join('');
        }

        if (lastSession.chunks && lastSession.chunks.length > 0) {
            chunksList.innerHTML = lastSession.chunks.map(chunk => `
                <div class="chunk-item">
                    <p class="chunk-text">${chunk}</p>
                </div>
            `).join('');
        }
    },

    async startAiQuiz() {
        const startBtn = document.getElementById('start-ai-quiz-btn');
        const quizContainer = document.getElementById('ai-quiz-container');
        const questionText = document.getElementById('ai-quiz-question-text');
        const answerInput = document.getElementById('ai-quiz-answer');
        const submitBtn = document.getElementById('submit-ai-answer-btn');
        const feedback = document.getElementById('ai-quiz-feedback');
        const nextBtn = document.getElementById('next-ai-question-btn');
        const endBtn = document.getElementById('end-ai-quiz-btn');

        const flashcards = FlashcardManager.cards;
        if (flashcards.length === 0) {
            alert('请先学习一些单词卡再开始 AI 提问练习！');
            return;
        }

        startBtn.hidden = true;
        quizContainer.hidden = false;
        feedback.hidden = true;
        nextBtn.hidden = true;
        endBtn.hidden = true;

        this.aiQuizQuestionCount = 0;
        this.aiQuizMaxQuestions = 5;

        await this.generateAiQuestion();

        submitBtn.addEventListener('click', async () => {
            const answer = answerInput.value.trim();
            if (!answer) return;

            submitBtn.disabled = true;
            submitBtn.textContent = '评估中...';

            try {
                const currentCard = FlashcardManager.getCurrentCard();
                const feedbackResult = await AI.evaluateAiQuizAnswer(
                    currentCard.word,
                    currentCard.meaning,
                    answer
                );

                feedback.innerHTML = `
                    <p><strong>AI 评价：</strong>${feedbackResult.feedback}</p>
                    <p><strong>参考回答：</strong>${feedbackResult.referenceAnswer}</p>
                `;
                feedback.hidden = false;
                nextBtn.hidden = false;
                endBtn.hidden = false;

            } catch (error) {
                feedback.innerHTML = `<p style="color: var(--danger-color);">评估失败：${error.message}</p>`;
                feedback.hidden = false;
                nextBtn.hidden = false;
            }

            submitBtn.disabled = false;
            submitBtn.textContent = '提交回答';
        });

        nextBtn.addEventListener('click', async () => {
            this.aiQuizQuestionCount++;
            if (this.aiQuizQuestionCount >= this.aiQuizMaxQuestions) {
                feedback.innerHTML = '<p><strong>练习完成！</strong>做得很好，继续加油！</p>';
                nextBtn.hidden = true;
                endBtn.hidden = false;
                submitBtn.hidden = true;
                answerInput.disabled = true;
                return;
            }

            FlashcardManager.nextCard();
            this.updateFlashcardDisplay();
            feedback.hidden = true;
            nextBtn.hidden = true;
            answerInput.value = '';
            await this.generateAiQuestion();
        });

        endBtn.addEventListener('click', () => {
            quizContainer.hidden = true;
            startBtn.hidden = false;
            submitBtn.hidden = false;
            answerInput.disabled = false;
            answerInput.value = '';
            feedback.hidden = true;
        });
    },

    async generateAiQuestion() {
        const questionText = document.getElementById('ai-quiz-question-text');
        const currentCard = FlashcardManager.getCurrentCard();

        if (!currentCard) {
            questionText.textContent = '没有可用的单词卡，请先生成单词卡。';
            return;
        }

        try {
            const question = await AI.generateAiQuizQuestion(currentCard);
            questionText.textContent = question;
        } catch (error) {
            questionText.textContent = `请用 "${currentCard.word}" 造一个句子。（${currentCard.meaning}）`;
        }
    },

    setupRecordsPage() {
        // Records page is updated on navigation
    },

    updateRecordsPage() {
        const totalSessions = Storage.getTotalSessions();
        const totalTime = Storage.getTotalPracticeTime();
        const currentStreak = Storage.getCurrentStreak();
        const flashcardsLearned = FlashcardManager.getLearnedCount();

        document.getElementById('total-sessions').textContent = totalSessions;
        document.getElementById('total-time').textContent = totalTime >= 3600 ? `${(totalTime / 3600).toFixed(1)}h` : `${Math.round(totalTime / 60)} min`;
        document.getElementById('current-streak').textContent = `${currentStreak} days`;
        document.getElementById('flashcards-learned').textContent = flashcardsLearned;

        this.updateHeatmap();
        this.updateWeeklyChart();
        this.updateMonthlyGoal();
        this.updateHistoryList();
    },

    updateHeatmap() {
        const heatmap = document.getElementById('practice-heatmap');
        const records = Storage.getRecords();
        const today = new Date();

        const sessionCountByDate = {};
        records.forEach(record => {
            const date = new Date(record.date);
            const dateStr = date.toDateString();
            sessionCountByDate[dateStr] = (sessionCountByDate[dateStr] || 0) + 1;
        });

        const maxSessions = Math.max(...Object.values(sessionCountByDate), 1);

        const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let html = dayHeaders.map(day => `<div class="heatmap-day-header">${day}</div>`).join('');

        const weeksToShow = 4;
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (weeksToShow * 7 - 1));

        const startDay = startDate.getDay();
        const mondayOffset = startDay === 0 ? 6 : startDay - 1;
        startDate.setDate(startDate.getDate() - mondayOffset);

        for (let week = 0; week < weeksToShow; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(currentDate.getDate() + (week * 7) + day);
                const dateStr = currentDate.toDateString();
                const count = sessionCountByDate[dateStr] || 0;
                const isToday = currentDate.toDateString() === today.toDateString();

                let level = '';
                if (count > 0) {
                    const ratio = count / maxSessions;
                    if (ratio <= 0.25) level = 'level-1';
                    else if (ratio <= 0.5) level = 'level-2';
                    else if (ratio <= 0.75) level = 'level-3';
                    else level = 'level-4';
                }

                html += `<div class="heatmap-cell ${level} ${isToday ? 'today' : ''}" title="${currentDate.toLocaleDateString()}: ${count} sessions"></div>`;
            }
        }

        heatmap.innerHTML = html;
    },

    updateWeeklyChart() {
        const chart = document.getElementById('weekly-chart');
        const records = Storage.getRecords();
        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        const sessionCountByDay = new Array(7).fill(0);
        records.forEach(record => {
            const recordDate = new Date(record.date);
            if (recordDate >= weekStart && recordDate <= today) {
                const dayIndex = recordDate.getDay();
                const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                sessionCountByDay[adjustedIndex]++;
            }
        });

        const maxCount = Math.max(...sessionCountByDay, 1);
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        let html = '';
        for (let i = 0; i < 7; i++) {
            const height = sessionCountByDay[i] > 0 ? `${(sessionCountByDay[i] / maxCount) * 100}%` : '4px';
            const isToday = i === mondayOffset;
            html += `
                <div class="chart-bar-wrapper">
                    <div class="chart-bar-value">${sessionCountByDay[i]}</div>
                    <div class="chart-bar ${isToday ? 'today' : ''}" style="height: ${height}"></div>
                    <div class="chart-bar-label">${dayLabels[i]}</div>
                </div>
            `;
        }

        chart.innerHTML = html;
    },

    updateMonthlyGoal() {
        const today = new Date();
        const month = today.toLocaleString('en', { month: 'long' });
        const year = today.getFullYear();
        const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();

        document.getElementById('goal-month-label').textContent = `${month} ${year}`;

        const records = Storage.getRecords();
        const currentMonthRecords = records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear();
        });

        const sessionCount = currentMonthRecords.length;
        const practicedDates = new Set(currentMonthRecords.map(r => new Date(r.date).getDate()));
        const daysActive = practicedDates.size;
        const flashcardsLearned = FlashcardManager.getLearnedCount();

        const goalSessions = 20;
        const goalDays = daysInMonth;
        const goalWords = 50;

        const sessionProgress = Math.min(sessionCount / goalSessions, 1);
        const daysProgress = Math.min(daysActive / goalDays, 1);
        const wordsProgress = Math.min(flashcardsLearned / goalWords, 1);

        const overallProgress = (sessionProgress + daysProgress + wordsProgress) / 3;
        const circumference = 314;
        const offset = circumference * (1 - overallProgress);

        document.getElementById('goal-progress-circle').style.strokeDashoffset = offset;
        document.getElementById('goal-percentage').textContent = `${Math.round(overallProgress * 100)}%`;
        document.getElementById('goal-sessions').textContent = `${sessionCount} / ${goalSessions}`;
        document.getElementById('goal-days').textContent = `${daysActive} / ${goalDays}`;
        document.getElementById('goal-words').textContent = `${flashcardsLearned} / ${goalWords}`;
    },

    updateHistoryList() {
        const historyList = document.getElementById('history-list');
        const records = Storage.getRecords();

        if (records.length === 0) {
            historyList.innerHTML = '<p class="placeholder">No sessions yet. Start practicing!</p>';
            return;
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        historyList.innerHTML = records.map(record => {
            const date = new Date(record.date);
            const day = date.getDate();
            const month = months[date.getMonth()];
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const duration = record.duration || 0;
            const errorCount = record.errors ? record.errors.length : 0;
            const chunkCount = record.chunks ? record.chunks.length : 0;

            let expandContent = '';
            if (record.errors && record.errors.length > 0) {
                const errorTags = record.errors.slice(0, 3).map(err => {
                    const original = err.original || '';
                    const corrected = err.corrected || '';
                    return `<span class="error-tag">${original} → ${corrected}</span>`;
                }).join('');

                const chunkTags = record.chunks ? record.chunks.slice(0, 3).map(chunk =>
                    `<span class="chunk-tag-new">${chunk.word || chunk}</span>`
                ).join('') : '';

                const firstCorrection = record.errors[0];
                const correctionPreview = `"${firstCorrection.original}" → "${firstCorrection.corrected}"`;

                expandContent = `
                    <div class="session-expand-content">
                        <div class="correction-preview">${correctionPreview}</div>
                        <div class="error-tags">${errorTags}</div>
                        ${chunkTags ? `<div style="margin-top: 8px;">${chunkTags}</div>` : ''}
                    </div>
                `;
            }

            return `
                <div class="session-item">
                    <div class="session-date-badge">
                        <span class="day">${day}</span>
                        <span class="month">${month}</span>
                    </div>
                    <div class="session-info">
                        <div class="session-title">${timeStr} Practice Session</div>
                        <div class="session-meta">
                            <span>⏱️ ${duration}s</span>
                            <span>📝 ${errorCount} corrections</span>
                            <span>📚 ${chunkCount} chunks</span>
                        </div>
                        ${expandContent}
                    </div>
                </div>
            `;
        }).join('');

        historyList.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('expanded');
            });
        });
    },

    loadApiKey() {
        AI.init();
        
        const savedKey = AI.getApiKey();
        const modal = document.getElementById('api-key-modal');
        const saveBtn = document.getElementById('save-api-key-btn');
        const skipBtn = document.getElementById('skip-api-key-btn');
        const input = document.getElementById('api-key-input');
        const providerRadios = document.querySelectorAll('input[name="api-provider"]');
        const settingsBtn = document.getElementById('settings-btn');
        const huaweiConfig = document.getElementById('huawei-config');
        const huaweiProjectIdInput = document.getElementById('huawei-project-id');
        const huaweiTokenInput = document.getElementById('huawei-token');

        const showProviderSelection = () => {
            const savedProvider = AI.getProvider();
            providerRadios.forEach(radio => {
                if (radio.value === savedProvider) {
                    radio.checked = true;
                }
            });
            modal.classList.remove('hidden');
            updateHuaweiConfigVisibility();
        };

        const updateHuaweiConfigVisibility = () => {
            const selectedProvider = document.querySelector('input[name="api-provider"]:checked').value;
            huaweiConfig.style.display = selectedProvider === 'huawei' ? 'block' : 'none';
        };

        providerRadios.forEach(radio => {
            radio.addEventListener('change', updateHuaweiConfigVisibility);
        });

        if (savedKey) {
            modal.classList.add('hidden');
        } else {
            showProviderSelection();
        }

        settingsBtn.addEventListener('click', showProviderSelection);

        saveBtn.addEventListener('click', () => {
            const key = input.value.trim();
            const selectedProvider = document.querySelector('input[name="api-provider"]:checked').value;
            
            if (selectedProvider === 'huawei') {
                const projectId = huaweiProjectIdInput.value.trim();
                const token = huaweiTokenInput.value.trim();
                
                if (projectId && token) {
                    localStorage.setItem('huaweiProjectId', projectId);
                    localStorage.setItem('huaweiToken', token);
                    AI.setProvider(selectedProvider);
                    modal.classList.add('hidden');
                } else {
                    alert('请输入华为云Project ID和Token');
                }
            } else if (key) {
                AI.setProvider(selectedProvider);
                AI.setApiKey(key);
                modal.classList.add('hidden');
            } else {
                input.style.borderColor = 'var(--danger-color)';
            }
        });

        skipBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
