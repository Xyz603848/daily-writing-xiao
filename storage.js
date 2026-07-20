const Storage = {
    MAX_RECORDS: 50,

    getCurrentUser() {
        const user = localStorage.getItem('dailyTalkingCurrentUser');
        return user ? JSON.parse(user) : null;
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('dailyTalkingCurrentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('dailyTalkingCurrentUser');
        }
    },

    getUsers() {
        const users = localStorage.getItem('dailyTalkingUsers');
        return users ? JSON.parse(users) : [];
    },

    saveUsers(users) {
        localStorage.setItem('dailyTalkingUsers', JSON.stringify(users));
    },

    registerUser(username, email, password) {
        const users = this.getUsers();
        if (users.find(u => u.username === username)) {
            throw new Error('Username already exists');
        }
        if (users.find(u => u.email === email)) {
            throw new Error('Email already exists');
        }
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    },

    loginUser(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            throw new Error('Invalid username or password');
        }
        return user;
    },

    logoutUser() {
        this.setCurrentUser(null);
    },

    getUserPrefix() {
        const user = this.getCurrentUser();
        return user ? `user_${user.id}_` : 'guest_';
    },

    getRecords() {
        const key = this.getUserPrefix() + 'records';
        const records = localStorage.getItem(key);
        return records ? JSON.parse(records) : [];
    },

    saveRecord(record) {
        const key = this.getUserPrefix() + 'records';
        const records = this.getRecords();

        const sanitizedRecord = {
            date: record.date,
            duration: record.duration,
            transcript: record.transcript,
            corrected: record.corrected,
            errors: record.errors || [],
            chunks: record.chunks || []
        };

        records.unshift(sanitizedRecord);

        while (records.length > this.MAX_RECORDS) {
            records.pop();
        }

        try {
            localStorage.setItem(key, JSON.stringify(records));
        } catch (e) {
            console.warn('Storage quota exceeded, removing oldest records');
            while (records.length > 10) {
                records.pop();
            }
            try {
                localStorage.setItem(key, JSON.stringify(records));
            } catch (e2) {
                console.error('Failed to save records:', e2);
            }
        }
    },

    getFlashcards() {
        const key = this.getUserPrefix() + 'flashcards';
        const flashcards = localStorage.getItem(key);
        return flashcards ? JSON.parse(flashcards) : [];
    },

    saveFlashcards(flashcards) {
        const key = this.getUserPrefix() + 'flashcards';
        try {
            localStorage.setItem(key, JSON.stringify(flashcards));
        } catch (e) {
            console.warn('Failed to save flashcards:', e);
        }
    },

    getLastSession() {
        const records = this.getRecords();
        return records.length > 0 ? records[0] : null;
    },

    getTotalSessions() {
        return this.getRecords().length;
    },

    getTotalPracticeTime() {
        const records = this.getRecords();
        return records.reduce((total, record) => total + (record.duration || 0), 0);
    },

    getCurrentStreak() {
        const records = this.getRecords();
        if (records.length === 0) return 0;

        const dates = records.map(r => new Date(r.date).toDateString());
        const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const dateStr of uniqueDates) {
            const recordDate = new Date(dateStr);
            recordDate.setHours(0, 0, 0, 0);
            
            const diffDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === streak) {
                streak++;
            } else if (diffDays > streak) {
                break;
            }
        }

        return streak;
    },

    getPracticedDates() {
        const records = this.getRecords();
        return records.map(r => new Date(r.date).toDateString());
    },

    clearAllData() {
        const key = this.getUserPrefix();
        localStorage.removeItem(key + 'records');
        localStorage.removeItem(key + 'flashcards');
    }
};
