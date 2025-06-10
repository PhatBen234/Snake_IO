class ChatService {
    constructor() {
        // Chat history storage (in-memory, could be replaced with database)
        this.chatHistory = new Map(); // roomId -> messages[]
        this.maxMessagesPerRoom = 100;
        this.messageRateLimit = new Map(); // playerId -> { count, resetTime }
        this.RATE_LIMIT_WINDOW = 60000; // 1 minute
        this.MAX_MESSAGES_PER_MINUTE = 10;
        
        // Player names storage for better chat experience
        this.playerNames = new Map(); // playerId -> playerName
    }

    // Handle incoming chat message
    handleChatMessage(socket, io, data) {
        try {
            // Validate input data
            const validation = this.validateChatMessage(data);
            if (!validation.valid) {
                socket.emit('chat-error', { message: validation.error });
                return;
            }

            // Check rate limiting
            if (!this.checkRateLimit(data.playerId)) {
                socket.emit('chat-error', { 
                    message: 'Too many messages. Please slow down.' 
                });
                return;
            }

            // Store/update player name for future reference
            if (data.username) {
                this.playerNames.set(data.playerId, data.username);
            }

            // Process and clean message
            const processedMessage = this.processMessage(data);

            // Store message in history
            this.storeChatMessage(data.roomId, processedMessage);

            // Broadcast message to all players in room
            io.to(data.roomId).emit('chat-message', processedMessage);

            // Log chat message (optional)
            console.log(`[CHAT] Room ${data.roomId} - ${processedMessage.username}: ${processedMessage.message}`);

        } catch (error) {
            console.error('Error handling chat message:', error);
            socket.emit('chat-error', { 
                message: 'Failed to send message. Please try again.' 
            });
        }
    }

    // Validate chat message data
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

        // Check message length
        if (data.message.length === 0) {
            return { valid: false, error: 'Message cannot be empty' };
        }

        if (data.message.length > 200) {
            return { valid: false, error: 'Message too long (max 200 characters)' };
        }

        // Check username length
        if (data.username.length > 20) {
            return { valid: false, error: 'Username too long (max 20 characters)' };
        }

        return { valid: true };
    }

    // Process and sanitize message
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

    // Sanitize text input (remove harmful content)
    sanitizeText(text) {
        return text
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .substring(0, 200); // Ensure max length
    }

    // Generate unique message ID
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Check rate limiting for spam prevention
    checkRateLimit(playerId) {
        const now = Date.now();
        const playerLimit = this.messageRateLimit.get(playerId);

        if (!playerLimit) {
            // First message from this player
            this.messageRateLimit.set(playerId, {
                count: 1,
                resetTime: now + this.RATE_LIMIT_WINDOW
            });
            return true;
        }

        // Check if rate limit window has expired
        if (now >= playerLimit.resetTime) {
            // Reset counter
            this.messageRateLimit.set(playerId, {
                count: 1,
                resetTime: now + this.RATE_LIMIT_WINDOW
            });
            return true;
        }

        // Check if under limit
        if (playerLimit.count < this.MAX_MESSAGES_PER_MINUTE) {
            playerLimit.count++;
            return true;
        }

        // Rate limit exceeded
        return false;
    }

    // Store chat message in history
    storeChatMessage(roomId, message) {
        if (!this.chatHistory.has(roomId)) {
            this.chatHistory.set(roomId, []);
        }

        const roomHistory = this.chatHistory.get(roomId);
        roomHistory.push(message);

        // Limit history size
        if (roomHistory.length > this.maxMessagesPerRoom) {
            roomHistory.shift(); // Remove oldest message
        }
    }

    // Get chat history for a room
    getChatHistory(roomId, limit = 20) {
        const roomHistory = this.chatHistory.get(roomId) || [];
        return roomHistory.slice(-limit); // Return last N messages
    }

    // Clear chat history for a room
    clearRoomHistory(roomId) {
        this.chatHistory.delete(roomId);
    }

    // Send chat history to newly joined player
    sendChatHistoryToPlayer(socket, roomId) {
        const history = this.getChatHistory(roomId, 20); // Send last 20 messages
        if (history.length > 0) {
            socket.emit('chat-history', { roomId, messages: history });
        }
    }

    // Clean up old rate limit entries
    cleanupRateLimits() {
        const now = Date.now();
        for (const [playerId, limit] of this.messageRateLimit.entries()) {
            if (now >= limit.resetTime) {
                this.messageRateLimit.delete(playerId);
            }
        }
    }

    // Broadcast system message to room
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

    // Handle player disconnect
    handlePlayerDisconnect(playerId) {
        // Clean up rate limiting for disconnected player
        this.messageRateLimit.delete(playerId);
        
        // Keep player name for a while in case they reconnect
        // Don't delete immediately: this.playerNames.delete(playerId);
    }

    // Get stored player name
    getPlayerName(playerId) {
        return this.playerNames.get(playerId) || `Player_${playerId.substring(0, 4)}`;
    }

    // Update player name
    updatePlayerName(playerId, newName) {
        if (playerId && newName) {
            this.playerNames.set(playerId, newName);
        }
    }

    // Get all chat data for a room (for syncing between scenes)
    getRoomChatData(roomId) {
        return {
            roomId: roomId,
            messages: this.getChatHistory(roomId, 50), // Get more messages for scene transitions
            playerNames: Object.fromEntries(this.playerNames)
        };
    }

    // Sync chat data when transitioning between scenes
    syncChatDataToPlayer(socket, roomId, playerId) {
        const chatData = this.getRoomChatData(roomId);
        socket.emit('chat-sync', chatData);
    }

    // Clean up old player names periodically
    cleanupPlayerNames() {
        // This could be called periodically to clean up old player names
        // For now, we'll keep them indefinitely for better UX
    }
}

module.exports = new ChatService();