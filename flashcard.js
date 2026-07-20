const FlashcardManager = {
    cards: [],
    currentIndex: 0,
    isFlipped: false,

    async generateFromErrors(errors) {
        this.cards = [];
        
        for (const error of errors) {
            const word = error.correction || error.original;
            const definition = await AI.getWordDefinition(word);
            
            this.cards.push({
                word: word,
                meaning: definition.meaning,
                example: definition.example || `Example: ${word}`,
                phonetic: definition.phonetic,
                partOfSpeech: definition.partOfSpeech,
                learned: false
            });
        }

        this.currentIndex = 0;
        Storage.saveFlashcards(this.cards);
        return this.cards;
    },

    async generateFromChunks(chunks) {
        this.cards = [];
        
        for (const chunk of chunks) {
            const definition = await AI.getWordDefinition(chunk);
            
            this.cards.push({
                word: chunk,
                meaning: definition.meaning || `"${chunk}"`,
                example: definition.example || `Example: "${chunk}"`,
                phonetic: definition.phonetic || '',
                partOfSpeech: definition.partOfSpeech || 'phrase',
                learned: false
            });
        }

        this.currentIndex = 0;
        Storage.saveFlashcards(this.cards);
        return this.cards;
    },

    loadFromStorage() {
        this.cards = Storage.getFlashcards();
        this.currentIndex = 0;
        return this.cards;
    },

    getCurrentCard() {
        if (this.cards.length === 0) return null;
        return this.cards[this.currentIndex];
    },

    nextCard() {
        if (this.currentIndex < this.cards.length - 1) {
            this.currentIndex++;
            this.isFlipped = false;
            return this.getCurrentCard();
        }
        return null;
    },

    prevCard() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.isFlipped = false;
            return this.getCurrentCard();
        }
        return null;
    },

    flipCard() {
        this.isFlipped = !this.isFlipped;
        return this.isFlipped;
    },

    markAsLearned() {
        if (this.cards[this.currentIndex]) {
            this.cards[this.currentIndex].learned = true;
            Storage.saveFlashcards(this.cards);
        }
    },

    getLearnedCount() {
        return this.cards.filter(card => card.learned).length;
    },

    getTotalCount() {
        return this.cards.length;
    }
};
