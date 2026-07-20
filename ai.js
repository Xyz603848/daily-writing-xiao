const AI = {
    apiKey: '',
    apiEndpoint: 'https://api.deepseek.com/v1',
    apiProvider: 'deepseek',
    conversationHistory: [],

    providers: {
        local: {
            name: 'Local (Free)',
            endpoint: 'local',
            model: 'local-rules'
        },
        qwen: {
            name: '通义千问',
            endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            model: 'qwen-plus'
        },
        kimi: {
            name: 'Kimi',
            endpoint: 'https://api.moonshot.cn/v1',
            model: 'moonshot-v1-8k'
        },
        deepseek: {
            name: 'DeepSeek',
            endpoint: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat'
        },
        huawei: {
            name: '华为云SIS',
            endpoint: 'https://sis-ext.cn-east-3.myhuaweicloud.com',
            model: 'huawei-sis',
            projectId: ''
        }
    },

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('dailyTalkingApiKey', key);
    },

    setProvider(provider) {
        this.apiProvider = provider;
        this.apiEndpoint = this.providers[provider].endpoint;
        localStorage.setItem('dailyTalkingApiProvider', provider);
    },

    getApiKey() {
        return this.apiKey || localStorage.getItem('dailyTalkingApiKey');
    },

    getProvider() {
        return this.apiProvider || localStorage.getItem('dailyTalkingApiProvider') || 'deepseek';
    },

    init() {
        const savedProvider = this.getProvider();
        this.setProvider(savedProvider);
    },

    resetConversation() {
        this.conversationHistory = [];
    },

    async chatWithAI(userMessage, isCorrection = false, imageData = null) {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                throw new Error('API key is not set. Please enter your API key or switch to Local mode.');
            }

            const provider = this.providers[this.apiProvider];

            if (this.apiProvider === 'local') {
                const text = Array.isArray(userMessage) ? userMessage.join(' ') : userMessage;
                return this.localProcess(text, isCorrection);
            }
            const modelName = provider.model;

            let systemPrompt = '';
            let messages = [];

            if (isCorrection) {
                systemPrompt = `你是一个专业的英语写作和图片描述分析专家。你的任务是：

**步骤1：图片内容分析**
- 仔细观察图片，识别所有关键视觉元素
- 描述场景、物体、人物、动作、颜色、氛围、光线、构图、细节
- 用中文写出详细的图片内容描述（必须至少50字）

**步骤2：用户输入整合**
- 阅读用户的所有历史输入
- 理解用户想要表达的核心意图和要点
- 识别用户描述中的优点和不足

**步骤3：综合描述生成**
- 基于图片内容和用户输入，生成一个完整、连贯的英文描述
- 融合图片细节和用户意图，确保信息准确完整
- 修正语法错误，优化表达，提升语言质量
- 提取有用的短语和语块

**输出要求（必须返回JSON格式）：**
{
  "corrected": "整合图片内容和用户输入后生成的完整英文描述，必须逻辑连贯、信息完整",
  "imageDescription": "对图片内容的详细中文描述，必须包含场景、物体、颜色、氛围等细节（至少50字）",
  "errors": [
    {"original": "原文中的错误表达", "correction": "修正后的正确表达", "explanation": "中文解释修改原因"}
  ],
  "chunks": ["从文本中提取的有用短语/语块，如名词短语、动词短语等"],
  "reply": "友好的中文回复，评价用户描述的准确性，给出改进建议"
}

**重要提示：**
- imageDescription字段不能为空，必须提供详细的图片描述
- corrected字段必须是完整的句子，整合图片内容和用户输入
- 如果无法分析图片，请在imageDescription中说明原因
- 必须严格按照JSON格式输出，不要添加额外文字`;

                const inputText = Array.isArray(userMessage) 
                    ? `用户的多次输入历史（按顺序）：\n${userMessage.map((input, index) => `${index + 1}. ${input}`).join('\n')}\n\n请分析图片并整合以上所有输入，生成一个完整、连贯的图片描述。`
                    : `用户的描述：${userMessage}\n\n请分析图片并纠正这个描述。`;

                if (imageData) {
                    console.log('📤 正在发送图片数据进行分析...');
                    console.log('📝 用户输入历史:', userMessage);
                    messages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: [
                            { type: 'text', text: inputText },
                            { type: 'image_url', image_url: { url: imageData } }
                        ]}
                    ];
                } else {
                    console.log('⚠️ 未检测到图片数据，仅处理文本');
                    messages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: inputText }
                    ];
                }
            } else {
                systemPrompt = `你是一个专业的英语语法纠正助手。你的任务是：
1. 分析用户输入的英语句子
2. 仅修正语法错误和拼写错误
3. 保持用户原始语义和表达意图，不进行内容扩充、风格调整或图片分析
4. 用中文回复，保持友好、鼓励和专业的语气

回复格式（严格按照此格式）：
【语法修正】
修正后的完整句子

【修改说明】
列出修改的语法错误及其原因

示例回复：
【语法修正】
The cat is sleeping on the sofa.

【修改说明】
- 将 "cat are" 修改为 "cat is"：主语是单数，动词需要用单数形式

鼓励语：继续加油！`;

                messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `请修正以下句子的语法错误：${userMessage}` }
                ];
            }

            console.log(`Sending request to ${provider.name} API (${this.apiEndpoint})...`);
            
            const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: messages,
                    temperature: isCorrection ? 0.3 : 0.7,
                    max_tokens: isCorrection ? 1000 : 500
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || response.statusText;
                
                if (response.status === 402) {
                    throw new Error('Insufficient API balance. Please switch to Local mode (free) or top up your account.');
                }
                throw new Error(`API Error (${response.status}): ${errorMsg}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            if (!isCorrection) {
                this.conversationHistory.push(
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: aiResponse }
                );
            }

            if (isCorrection) {
                let result;
                try {
                    result = JSON.parse(aiResponse);
                } catch (e) {
                    console.warn('⚠️ JSON解析失败，尝试备用解析:', e.message);
                    result = this.parseAIResponse(aiResponse);
                }
                
                console.log('📥 AI返回数据:', result);
                
                return this.validateAndCompleteResponse(result, userMessage);
            }

            return { reply: aiResponse };
        } catch (error) {
            console.error('Chat error:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('🌐 网络连接失败：无法连接到AI服务，请检查您的网络连接。');
            }
            if (error.message.includes('API key is not set')) {
                throw new Error('🔑 API密钥未设置：请在设置中配置您的API密钥，或切换到本地模式（免费）。');
            }
            if (error.message.includes('Insufficient API balance')) {
                throw new Error('💳 API余额不足：您的API账户余额不足，请充值或切换到本地模式（免费）。');
            }
            if (error.message.includes('quota') || error.message.includes('limit')) {
                throw new Error('⚠️ 请求受限：API请求次数已达到限制，请稍后重试或切换到本地模式。');
            }
            throw new Error(`❌ 服务不可用：${error.message}`);
        }
    },

    localProcess(text, isCorrection) {
        const commonErrors = [
            { pattern: /\bi\b/g, correction: 'I', explanation: 'Capitalize "I" / 大写 "I"' },
            { pattern: /\bdont\b/gi, correction: "don't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bcant\b/gi, correction: "can't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bwont\b/gi, correction: "won't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bdidnt\b/gi, correction: "didn't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bisnt\b/gi, correction: "isn't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\barent\b/gi, correction: "aren't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bwasnt\b/gi, correction: "wasn't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bwerent\b/gi, correction: "weren't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bhasnt\b/gi, correction: "hasn't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bhavent\b/gi, correction: "haven't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bcouldnt\b/gi, correction: "couldn't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bshouldnt\b/gi, correction: "shouldn't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bwouldnt\b/gi, correction: "wouldn't", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bthats\b/gi, correction: "that's", explanation: 'Add apostrophe / 加撇号' },
            { pattern: /\bteh\b/gi, correction: 'the', explanation: 'Spelling correction / 拼写修正' },
            { pattern: /\brecieve\b/gi, correction: 'receive', explanation: 'Spelling: i before e except after c / 拼写规则' },
            { pattern: /\boccured\b/gi, correction: 'occurred', explanation: 'Spelling: double r / 双写 r' },
            { pattern: /\bseperate\b/gi, correction: 'separate', explanation: 'Spelling correction / 拼写修正' },
            { pattern: /\bdefinately\b/gi, correction: 'definitely', explanation: 'Spelling correction / 拼写修正' },
            { pattern: /\baccomodate\b/gi, correction: 'accommodate', explanation: 'Spelling: double c, double m / 双写 c 和 m' },
            { pattern: /\buntill\b/gi, correction: 'until', explanation: 'Spelling: single l / 单写 l' },
            { pattern: /\bwich\b/gi, correction: 'which', explanation: 'Spelling correction / 拼写修正' },
            { pattern: /\bthier\b/gi, correction: 'their', explanation: 'Spelling correction / 拼写修正' },
            { pattern: /\balot\b/gi, correction: 'a lot', explanation: 'Should be two words / 应为两个词' },
            { pattern: /\bgonna\b/gi, correction: 'going to', explanation: 'Use formal "going to" / 使用正式表达' },
            { pattern: /\bwanna\b/gi, correction: 'want to', explanation: 'Use formal "want to" / 使用正式表达' },
            { pattern: /\bgotta\b/gi, correction: 'got to', explanation: 'Use formal "got to" / 使用正式表达' },
        ];

        const errors = [];
        let corrected = text;

        commonErrors.forEach(rule => {
            const matches = corrected.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    if (match !== rule.correction) {
                        errors.push({
                            original: match,
                            correction: rule.correction,
                            explanation: rule.explanation
                        });
                        corrected = corrected.replace(match, rule.correction);
                    }
                });
            }
        });

        const sentences = corrected.split(/[.!?]+/).filter(s => s.trim());
        const chunks = sentences.slice(0, 3).map(s => s.trim());

        const replies = [
            "做得不错！已修正一些语法问题，继续练习！",
            "很好！以下是一些修改建议。",
            "英文写作很棒！发现了一些需要修改的地方。",
            "做得好！你的英语在进步。"
        ];

        if (isCorrection) {
            return {
                corrected: corrected,
                imageDescription: '由于使用本地模式，无法分析图片内容。建议配置API密钥以启用图片分析功能。',
                errors: errors,
                chunks: chunks,
                reply: replies[Math.floor(Math.random() * replies.length)]
            };
        }

        return {
            reply: replies[Math.floor(Math.random() * replies.length)] + " 点击分析按钮获取详细修改！"
        };
    },

    async transcribeAudio(audioBlob) {
        try {
            // 如果当前提供商是华为云SIS，使用华为云API
            if (this.apiProvider === 'huawei') {
                return await this.transcribeAudioWithHuawei(audioBlob);
            }
            
            // 默认使用OpenAI Whisper API
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-1');
            formData.append('language', 'en');

            const response = await fetch(`${this.apiEndpoint}/audio/transcriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getApiKey()}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.text;
        } catch (error) {
            console.error('Transcription error:', error);
            throw error;
        }
    },

    // 华为云SIS一句话语音识别
    async transcribeAudioWithHuawei(audioBlob) {
        try {
            console.log('🎤 使用华为云SIS进行语音识别...');
            
            // 获取华为云配置
            const projectId = localStorage.getItem('huaweiProjectId') || '';
            const token = localStorage.getItem('huaweiToken') || '';
            
            if (!projectId) {
                throw new Error('华为云Project ID未设置，请在设置中配置');
            }
            
            if (!token) {
                throw new Error('华为云Token未设置，请先获取IAM Token');
            }

            // 将audioBlob转换为ArrayBuffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // 华为云SIS一句话识别API
            const url = `https://sis-ext.cn-east-3.myhuaweicloud.com/v1/${projectId}/asr/short-audio`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'audio/wav',
                    'X-Auth-Token': token,
                    'region': 'cn-east-3'
                },
                body: arrayBuffer
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('华为云SIS错误响应:', errorText);
                throw new Error(`华为云语音识别失败: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('华为云SIS识别结果:', data);
            
            // 解析识别结果
            if (data.result && data.result.text) {
                return data.result.text;
            } else {
                throw new Error('华为云SIS返回的识别结果为空');
            }
        } catch (error) {
            console.error('华为云SIS语音识别错误:', error);
            throw error;
        }
    },

    async correctGrammar(text) {
        try {
            const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getApiKey()}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an English grammar correction expert. Analyze the user's speech and return a JSON object with:
1. "corrected": The fully corrected version
2. "errors": Array of objects with "original", "correction", and "explanation"
3. "chunks": Array of useful phrases/chunks from the text

Format: {"corrected": "...", "errors": [{"original": "...", "correction": "...", "explanation": "..."}], "chunks": ["..."]}`
                        },
                        {
                            role: 'user',
                            content: `Please correct my English speech and extract useful chunks:\n\n${text}`
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`Grammar correction failed: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            
            try {
                return JSON.parse(content);
            } catch (e) {
                return this.parseAIResponse(content);
            }
        } catch (error) {
            console.error('Grammar correction error:', error);
            throw error;
        }
    },

    async generateSpeech(text) {
        if ('speechSynthesis' in window) {
            return new Promise((resolve, reject) => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 1;
                
                const voices = speechSynthesis.getVoices();
                const englishVoice = voices.find(v => v.lang.startsWith('en'));
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }

                utterance.onend = () => {
                    resolve(null);
                };
                
                utterance.onerror = (e) => {
                    reject(new Error('Speech synthesis error: ' + e.error));
                };

                speechSynthesis.speak(utterance);
            });
        }
        throw new Error('Browser does not support speech synthesis');
    },

    speakText(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                reject(new Error('Browser does not support speech synthesis'));
                return;
            }

            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = options.rate || 1;
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;

            const voices = speechSynthesis.getVoices();
            const englishVoice = voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'));
            if (englishVoice) {
                utterance.voice = englishVoice;
            }

            if (options.onWordBoundary) {
                utterance.onboundary = (event) => {
                    if (event.name === 'word') {
                        options.onWordBoundary(event.charIndex, event.charLength);
                    }
                };
            }

            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(new Error('Speech error: ' + e.error));

            speechSynthesis.speak(utterance);
        });
    },

    stopSpeaking() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    },

    pauseSpeaking() {
        if ('speechSynthesis' in window) {
            speechSynthesis.pause();
        }
    },

    resumeSpeaking() {
        if ('speechSynthesis' in window) {
            speechSynthesis.resume();
        }
    },

    async generateAiQuizQuestion(card) {
        if (this.apiProvider === 'local') {
            return this.localGenerateQuizQuestion(card);
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API key is not set.');
        }

        const provider = this.providers[this.apiProvider];
        const systemPrompt = `你是一个英语老师。根据给定的单词/语块，生成一个让学生用该词造句的问题。用中文提问。`;

        const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `单词/语块：${card.word}\n含义：${card.meaning}\n词性：${card.partOfSpeech || '未知'}\n\n请生成一个让学生用这个词造句的问题。` }
                ],
                temperature: 0.8,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    },

    localGenerateQuizQuestion(card) {
        const questionTemplates = [
            `请用 "${card.word}" 造一个句子。（含义：${card.meaning}）`,
            `试着用 "${card.word}" 写一句话，描述你最近做的事情。`,
            `用 "${card.word}" 造句，表达你的一个想法或感受。`,
            `请用 "${card.word}" 写一个完整的句子。`
        ];
        return questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
    },

    async evaluateAiQuizAnswer(word, meaning, userAnswer) {
        if (this.apiProvider === 'local') {
            return this.localEvaluateAnswer(word, meaning, userAnswer);
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API key is not set.');
        }

        const provider = this.providers[this.apiProvider];
        const systemPrompt = `你是一个英语老师。评估学生用给定单词造的句子，给出中文反馈和参考回答。返回 JSON 格式：{"feedback": "中文评价", "referenceAnswer": "参考句子"}`;

        const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `单词：${word}\n含义：${meaning}\n学生回答：${userAnswer}\n\n请评价学生的句子是否正确使用了该单词，并给出参考回答。` }
                ],
                temperature: 0.5,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        try {
            return JSON.parse(content);
        } catch (e) {
            return {
                feedback: content,
                referenceAnswer: ''
            };
        }
    },

    localEvaluateAnswer(word, meaning, userAnswer) {
        const hasWord = userAnswer.toLowerCase().includes(word.toLowerCase());
        const isLongEnough = userAnswer.length > 10;

        let feedback = '';
        if (hasWord && isLongEnough) {
            feedback = `很好！你正确地使用了 "${word}"，句子也很完整。继续加油！`;
        } else if (hasWord) {
            feedback = `你用到了 "${word}"，不错！试着把句子写得更完整一些。`;
        } else {
            feedback = `你的句子中没有用到 "${word}" 哦，再试一次吧！`;
        }

        return {
            feedback: feedback,
            referenceAnswer: `I used "${word}" in my daily life.`
        };
    },

    async getWordDefinition(word) {
        try {
            const apiKey = this.getApiKey();
            
            if (apiKey && this.apiProvider !== 'local') {
                const provider = this.providers[this.apiProvider];
                const systemPrompt = `你是一个英语词典。为给定的英语单词/短语提供：
1. 中文翻译
2. 一个使用该词的英语例句

只返回 JSON 格式：{"translation": "中文翻译", "example": "英语例句"}`;

                const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: provider.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: `单词/短语：${word}` }
                        ],
                        temperature: 0.3,
                        max_tokens: 200
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data.choices[0].message.content;
                    try {
                        const result = JSON.parse(content);
                        return {
                            word: word,
                            phonetic: '',
                            meaning: result.translation || '',
                            example: result.example || this.generateSentence(word),
                            partOfSpeech: ''
                        };
                    } catch (e) {
                        console.warn('Failed to parse AI response, using fallback');
                    }
                }
            }

            const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            
            if (dictResponse.ok) {
                const data = await dictResponse.json();
                const entry = data[0];
                const definition = entry.meanings[0]?.definitions[0]?.definition || '';
                
                return {
                    word: entry.word,
                    phonetic: entry.phonetic || entry.phonetics[0]?.text || '',
                    meaning: definition || 'Definition not available',
                    example: this.generateSentence(word, definition),
                    partOfSpeech: entry.meanings[0]?.partOfSpeech || ''
                };
            }

            return this.generateFallbackDefinition(word);
        } catch (error) {
            console.error('Definition error:', error);
            return this.generateFallbackDefinition(word);
        }
    },

    generateSentence(word, meaning = '') {
        const templates = [
            `I ${word.includes('ing') ? 'am' : 'want to'} ${word} every day.`,
            `She showed me how to ${word} properly.`,
            `Learning to ${word} has been very helpful.`,
            `The ${word} technique is essential for beginners.`,
            `Can you explain how to ${word}?`,
            `We need to ${word} carefully to avoid mistakes.`,
            `He taught me a new way to ${word}.`,
            `My goal is to ${word} more effectively.`,
            `The ${word} is very important in this context.`,
            `I found a useful ${word} that helped me a lot.`,
            `Learning about ${word} has improved my skills.`,
            `This ${word} is commonly used in everyday conversation.`,
            `Understanding ${word} is key to mastering English.`
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    },

    generateFallbackDefinition(word) {
        return {
            word: word,
            phonetic: '',
            meaning: `The word "${word}"`,
            example: this.generateSentence(word, ''),
            partOfSpeech: ''
        };
    },

    parseAIResponse(content) {
        const result = {
            corrected: '',
            imageDescription: '',
            errors: [],
            chunks: [],
            reply: ''
        };

        const correctedMatch = content.match(/"corrected"\s*:\s*"([^"]+)"/);
        if (correctedMatch) {
            result.corrected = correctedMatch[1];
        }

        const imageDescMatch = content.match(/"imageDescription"\s*:\s*"([^"]+)"/);
        if (imageDescMatch) {
            result.imageDescription = imageDescMatch[1];
        }

        const errorsMatch = content.match(/"errors"\s*:\s*(\[[\s\S]*?\])/);
        if (errorsMatch) {
            try {
                result.errors = JSON.parse(errorsMatch[1]);
            } catch (e) {
                result.errors = [];
            }
        }

        const chunksMatch = content.match(/"chunks"\s*:\s*(\[[\s\S]*?\])/);
        if (chunksMatch) {
            try {
                result.chunks = JSON.parse(chunksMatch[1]);
            } catch (e) {
                result.chunks = [];
            }
        }

        const replyMatch = content.match(/"reply"\s*:\s*"([^"]+)"/);
        if (replyMatch) {
            result.reply = replyMatch[1];
        }

        return result;
    },

    validateAndCompleteResponse(result, userMessage) {
        const text = Array.isArray(userMessage) ? userMessage.join(' ') : userMessage;
        
        if (!result.corrected || result.corrected.trim() === '') {
            result.corrected = text;
            console.warn('⚠️ AI未返回corrected字段，使用原始文本');
        }
        
        if (!result.imageDescription || result.imageDescription.trim() === '') {
            result.imageDescription = '无法获取图片内容描述。请确保已上传图片并使用支持图片分析的API服务。';
            console.warn('⚠️ AI未返回imageDescription字段');
        }
        
        if (!result.errors || !Array.isArray(result.errors)) {
            result.errors = [];
        }
        
        if (!result.chunks || !Array.isArray(result.chunks)) {
            result.chunks = this.extractChunks(result.corrected);
        }
        
        if (!result.reply || result.reply.trim() === '') {
            result.reply = '分析完成！已为您整合图片内容和描述。';
        }
        
        return result;
    },

    extractChunks(text) {
        const chunks = [];
        const patterns = [
            /\b(?:a|an|the)\s+\w+\s+\w+/gi,
            /\b\w+\s+(?:in|on|at|with|for|of)\s+\w+/gi,
            /\b(?:beautiful|wonderful|amazing|colorful|peaceful)\s+\w+/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const trimmed = match.trim().toLowerCase();
                    if (!chunks.includes(trimmed) && trimmed.length > 5) {
                        chunks.push(trimmed);
                    }
                });
            }
        });
        
        return chunks.slice(0, 5);
    },

    highlightErrors(text, errors) {
        let highlighted = text;
        
        errors.forEach(error => {
            const regex = new RegExp(`\\b${error.original}\\b`, 'gi');
            highlighted = highlighted.replace(
                regex,
                `<span class="error-word" data-correction="${error.correction}">${error.original}</span>`
            );
        });

        return highlighted;
    }
};
