class ChatService {
    constructor() {
        this.chatHistory = new Map();
        this.maxMessagesPerRoom = 100;
        this.messageRateLimit = new Map();
        this.RATE_LIMIT_WINDOW = 60000; 
        this.MAX_MESSAGES_PER_MINUTE = 10;
        
        this.playerNames = new Map();
    }

    handleChatMessage(socket, io, data) {
        try {
            const validation = this.validateChatMessage(data);
            if (!validation.valid) {
                socket.emit('chat-error', { message: validation.error });
                return;
            }

            if (!this.checkRateLimit(data.playerId)) {
                socket.emit('chat-error', { 
                    message: 'Too many messages. Please slow down.' 
                });
                return;
            }

            if (data.username) {
                this.playerNames.set(data.playerId, data.username);
            }

            const processedMessage = this.processMessage(data);

            this.storeChatMessage(data.roomId, processedMessage);

            io.to(data.roomId).emit('chat-message', processedMessage);

            console.log(`[CHAT] Room ${data.roomId} - ${processedMessage.username}: ${processedMessage.message}`);

        } catch (error) {
            console.error('Error handling chat message:', error);
            socket.emit('chat-error', { 
                message: 'Failed to send message. Please try again.' 
            });
        }
    }

    validateChatMessage(data) {
        if (!data) {
            return { valid: false, error: 'No message data provided' };
        }

        if (!data.roomId || typeof data.roomId !== 'string') {
            return { valid: false, error: 'Invalid room ID' };
        }

        if (!data.playerId || typeof data.playerId !== 'string') {
            return { valid: false, error: 'Invalid player ID' };
        }

        if (!data.username || typeof data.username !== 'string') {
            return { valid: false, error: 'Invalid username' };
        }

        if (!data.message || typeof data.message !== 'string') {
            return { valid: false, error: 'Invalid message' };
        }

        if (data.message.length === 0) {
            return { valid: false, error: 'Message cannot be empty' };
        }

        if (data.message.length > 200) {
            return { valid: false, error: 'Message too long (max 200 characters)' };
        }

        if (data.username.length > 20) {
            return { valid: false, error: 'Username too long (max 20 characters)' };
        }

        return { valid: true };
    }

    processMessage(data) {
        return {
            roomId: data.roomId,
            playerId: data.playerId,
            username: this.sanitizeText(data.username),
            message: this.sanitizeText(data.message),
            timestamp: Date.now(),
            id: this.generateMessageId(),
            isSystem: false
        };
    }

    sanitizeText(text) {
        return text
            .trim()
            .replace(/[<>]/g, '') 
            .replace(/\s+/g, ' ') 
            .substring(0, 200); 
    }

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    checkRateLimit(playerId) {
        const now = Date.now();
        const playerLimit = this.messageRateLimit.get(playerId);

        if (!playerLimit) {
            this.messageRateLimit.set(playerId, {
                count: 1,
                resetTime: now + this.RATE_LIMIT_WINDOW
            });
            return true;
        }

        if (now >= playerLimit.resetTime) {
            this.messageRateLimit.set(playerId, {
                count: 1,
                resetTime: now + this.RATE_LIMIT_WINDOW
            });
            return true;
        }

        if (playerLimit.count < this.MAX_MESSAGES_PER_MINUTE) {
            playerLimit.count++;
            return true;
        }

        return false;
    }

    storeChatMessage(roomId, message) {
        if (!this.chatHistory.has(roomId)) {
            this.chatHistory.set(roomId, []);
        }

        const roomHistory = this.chatHistory.get(roomId);
        roomHistory.push(message);

        if (roomHistory.length > this.maxMessagesPerRoom) {
            roomHistory.shift(); 
        }
    }

    getChatHistory(roomId, limit = 20) {
        const roomHistory = this.chatHistory.get(roomId) || [];
        return roomHistory.slice(-limit);
    }

    clearRoomHistory(roomId) {
        this.chatHistory.delete(roomId);
    }

    sendChatHistoryToPlayer(socket, roomId) {
        const history = this.getChatHistory(roomId, 20); 
        if (history.length > 0) {
            socket.emit('chat-history', { roomId, messages: history });
        }
    }

    cleanupRateLimits() {
        const now = Date.now();
        for (const [playerId, limit] of this.messageRateLimit.entries()) {
            if (now >= limit.resetTime) {
                this.messageRateLimit.delete(playerId);
            }
        }
    }

    broadcastSystemMessage(io, roomId, message, color = 'yellow') {
        const systemMessage = {
            roomId: roomId,
            playerId: 'system',
            username: 'System',
            message: message,
            timestamp: Date.now(),
            id: this.generateMessageId(),
            isSystem: true,
            color: color
        };

        io.to(roomId).emit('chat-message', systemMessage);
        this.storeChatMessage(roomId, systemMessage);
    }

    handlePlayerDisconnect(playerId) {
        this.messageRateLimit.delete(playerId);
    }

    getPlayerName(playerId) {
        return this.playerNames.get(playerId) || `Player_${playerId.substring(0, 4)}`;
    }

    updatePlayerName(playerId, newName) {
        if (playerId && newName) {
            this.playerNames.set(playerId, newName);
        }
    }

    getRoomChatData(roomId) {
        return {
            roomId: roomId,
            messages: this.getChatHistory(roomId, 50),
            playerNames: Object.fromEntries(this.playerNames)
        };
    }

    syncChatDataToPlayer(socket, roomId, playerId) {
        const chatData = this.getRoomChatData(roomId);
        socket.emit('chat-sync', chatData);
    }

    cleanupPlayerNames() {
    }
}

module.exports = new ChatService();