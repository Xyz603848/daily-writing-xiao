const Recorder = {
    mediaRecorder: null,
    audioChunks: [],
    audioBlob: null,
    stream: null,
    timerInterval: null,
    timeRemaining: 60,
    isRecording: false,
    audioContext: null,
    analyser: null,
    dataArray: null,
    animationId: null,

    async startRecording(onTimeUpdate, onStop, onRecordingState) {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                console.log('Audio blob size:', this.audioBlob.size, 'bytes');
                this.stream.getTracks().forEach(track => track.stop());
                this.isRecording = false;
                if (onRecordingState) onRecordingState(false);
                if (onStop) onStop(this.audioBlob);
            };

            this.mediaRecorder.onerror = (e) => {
                console.error('Recording error:', e);
                alert('录音出错，请重试');
            };

            this.mediaRecorder.start(100);
            this.isRecording = true;
            this.timeRemaining = 60;
            
            if (onRecordingState) onRecordingState(true);

            this.timerInterval = setInterval(() => {
                this.timeRemaining--;
                if (onTimeUpdate) onTimeUpdate(this.timeRemaining);
                
                if (this.timeRemaining <= 0) {
                    this.stopRecording();
                }
            }, 1000);

            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            if (error.name === 'NotAllowedError') {
                alert('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风');
            } else if (error.name === 'NotFoundError') {
                alert('未找到麦克风设备');
            } else {
                alert('无法访问麦克风：' + error.message);
            }
            return false;
        }
    },

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
            clearInterval(this.timerInterval);
            this.isRecording = false;
        }
    },

    pauseRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            clearInterval(this.timerInterval);
        }
    },

    resumeRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.startTimer();
        }
    },

    getAudioBlob() {
        return this.audioBlob;
    },

    getAudioURL() {
        if (this.audioBlob) {
            return URL.createObjectURL(this.audioBlob);
        }
        return null;
    },

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
};
