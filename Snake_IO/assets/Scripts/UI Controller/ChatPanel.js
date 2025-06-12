cc.Class({
    extends: cc.Component,

    properties: {
        editBox: cc.EditBox,
        scrollView: cc.ScrollView,
        chatContent: cc.Node,
        chatItemPrefab: cc.Prefab
    },

    onLoad() {
        this.editBox.node.active = false;
        this.scrollView.node.active = false;
        
        this.hideTimer = null;
        this.HIDE_DELAY = 5;
        this._justBlurred = false;
        this._lastBlurTime = 0;
        this._blurredByEnter = false;
        
        this.socket = null;
        this.currentRoom = null;
        this.username = null;
        this.playerId = null;
        this.isInitialized = false;
        
        this.messageQueue = [];
        this.maxMessages = 50;
        
        this.initializeSocket();
        this.setupEventListeners();
    },

    onDestroy() {
        this.cleanup();
    },

    initializeSocket() {
        this.socket = window.gameSocket;
        this.currentRoom = window.currentRoomId;
        this.playerId = window.currentPlayerId;
        this.username = window.currentUsername || window.currentPlayerName;

        if (!this.socket) {
            console.warn('ChatPanel: No socket connection found, will retry...');
            this.scheduleOnce(() => {
                this.initializeSocket();
            }, 1);
            return;
        }

        this.setupSocketEvents();
        this.isInitialized = true;
        
        this.processMessageQueue();
    },

    setupSocketEvents() {
        if (!this.socket) return;

        this.socket.off('chat-message');
        this.socket.off('chat-error');
        this.socket.off('player-joined');
        this.socket.off('player-left');
        this.socket.off('chat-history');

        this.socket.on('chat-message', (data) => {
            if (data.roomId === this.currentRoom) {
                this.displayChatMessage(data);
            }
        });

        this.socket.on('chat-error', (data) => {
            this.displaySystemMessage(`Chat Error: ${data.message}`, cc.Color.RED);
        });

        this.socket.on('player-joined', (data) => {
            if (data.playerId !== this.playerId && data.roomId === this.currentRoom) {
                this.displaySystemMessage(`${data.playerName} joined`, cc.Color.GREEN);
            }
        });

        this.socket.on('player-left', (data) => {
            if (data.playerId !== this.playerId && data.roomId === this.currentRoom) {
                this.displaySystemMessage(`${data.playerName} left`, cc.Color.ORANGE);
            }
        });

        this.socket.on('chat-history', (data) => {
            if (data.roomId === this.currentRoom) {
                this.loadChatHistory(data.messages);
            }
        });

        this.socket.on('connect', () => {
            this.displaySystemMessage('Connected to chat server', cc.Color.GREEN);
        });

        this.socket.on('disconnect', () => {
            this.displaySystemMessage('Disconnected from chat server', cc.Color.RED);
        });
    },

    setupEventListeners() {
        this.editBox.node.on('editing-return', this.onSendMessage, this);
        this.editBox.node.on('editing-did-ended', this.onEditBoxBlur, this);
        
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        
        if (this.node.parent) {
            this.node.parent.on(cc.Node.EventType.TOUCH_START, this.onUserInteraction, this);
        }
    },

    onKeyDown(event) {
        if (event.keyCode === cc.macro.KEY.enter) {
            this.handleEnterKey();
        } else if (event.keyCode === cc.macro.KEY.escape) {
            this.hideChatUI();
        }
    },

    handleEnterKey() {
        const currentTime = Date.now();

        if (!this.editBox.node.active) {
            this.showChatUI();
            this.editBox.focus();
            this.resetBlurState();
        } else if (!this.editBox.isFocused()) {
            if (this._blurredByEnter || currentTime - this._lastBlurTime > 200) {
                this.scheduleOnce(() => {
                    this.editBox.focus();
                }, 0.1);
                this.resetBlurState();
            }
        } else {
            const msg = this.editBox.string.trim();
            if (msg.length === 0) {
                this._blurredByEnter = true;
                this.editBox.blur();
                this._justBlurred = true;
                this._lastBlurTime = currentTime;
            }
        }
    },

    resetBlurState() {
        this._justBlurred = false;
        this._blurredByEnter = false;
    },

    showChatUI() {
        this.editBox.node.active = true;
        this.scrollView.node.active = true;
        this.clearHideTimer();
        
        this.scheduleOnce(() => {
            this.scrollToBottom();
        }, 0.1);
    },

    hideChatUI() {
        this.editBox.node.active = false;
        this.scrollView.node.active = false;
        this.clearHideTimer();
        
        if (this.editBox.isFocused()) {
            this.editBox.blur();
        }
    },

    startHideTimer() {
        this.clearHideTimer();
        this.hideTimer = setTimeout(() => {
            if (!this.editBox.isFocused()) {
                this.hideChatUI();
            }
        }, this.HIDE_DELAY * 1000);
    },

    clearHideTimer() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    },

    onSendMessage() {
        const msg = this.editBox.string.trim();
        if (msg.length === 0) {
            this.editBox.blur();
            this._lastBlurTime = Date.now();
            return;
        }

        if (!this.validateMessage(msg)) {
            return;
        }

        this.sendChatMessage(msg);

        this.editBox.string = "";
        this.scheduleOnce(() => {
            this.editBox.focus();
        }, 0.1);
    },

    validateMessage(message) {
        if (this.handleCommand(message)) {
            return false; 
        }
        
        if (message.length > 200) {
            this.displaySystemMessage('Message too long (max 200 characters)', cc.Color.RED);
            return false;
        }

        if (!this.socket || !this.currentRoom || !this.username) {
            this.displaySystemMessage('Cannot send message: Not connected to room', cc.Color.RED);
            return false;
        }

        if (this.containsInappropriateContent(message)) {
            this.displaySystemMessage('Message contains inappropriate content', cc.Color.RED);
            return false;
        }

        return true;
    },

    containsInappropriateContent(message) {
        const bannedWords = ['spam', 'hack', 'cheat'];
        const lowerMessage = message.toLowerCase();
        
        return bannedWords.some(word => lowerMessage.includes(word));
    },

    sendChatMessage(message) {
        const chatData = {
            roomId: this.currentRoom,
            playerId: this.playerId,
            username: this.username,
            message: message,
            timestamp: Date.now(),
            messageId: this.generateMessageId()
        };

        if (!this.socket || !this.socket.connected) {
            this.messageQueue.push(chatData);
            this.displaySystemMessage('Message queued (offline)', cc.Color.YELLOW);
            return;
        }

        this.socket.emit('chat-message', chatData, (response) => {
            if (response && response.success) {
                console.log('Message sent successfully');
            } else {
                this.displaySystemMessage('Failed to send message', cc.Color.RED);
                this.messageQueue.push(chatData); 
            }
        });
    },

    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    processMessageQueue() {
        if (!this.socket || !this.socket.connected || this.messageQueue.length === 0) {
            return;
        }

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.socket.emit('chat-message', message);
        }

        if (this.messageQueue.length > 0) {
            this.displaySystemMessage('Queued messages sent', cc.Color.GREEN);
        }
    },

    displayChatMessage(data) {
        if (!this.chatItemPrefab || !this.chatContent) return;

        const chatItem = cc.instantiate(this.chatItemPrefab);
        const label = chatItem.getComponentInChildren(cc.Label);

        if (label) {
            const displayText = this.formatChatMessage(data);
            label.string = displayText;
            
            this.applyChatMessageStyle(label, data);
        }

        this.addChatItem(chatItem);
    },

    formatChatMessage(data) {
        const timeStr = this.formatTime(data.timestamp);
        return `[${timeStr}] ${data.username}: ${data.message}`;
    },

    applyChatMessageStyle(label, data) {
        if (data.playerId === this.playerId) {
            label.node.color = cc.Color.CYAN;
        } else {
            label.node.color = cc.Color.WHITE;
        }

        if (data.isSystemMessage) {
            label.node.color = cc.Color.YELLOW;
            label.fontSize = Math.max(14, label.fontSize * 0.9);
        }
    },

    displaySystemMessage(message, color = cc.Color.YELLOW) {
        if (!this.chatItemPrefab || !this.chatContent) return;

        const chatItem = cc.instantiate(this.chatItemPrefab);
        const label = chatItem.getComponentInChildren(cc.Label);

        if (label) {
            const timeStr = this.formatTime(Date.now());
            label.string = `[${timeStr}] [System] ${message}`;
            label.node.color = color;
            label.fontSize = Math.max(14, label.fontSize * 0.9);
        }

        this.addChatItem(chatItem);
    },

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },

    addChatItem(chatItem) {
        if (!this.chatContent) return;

        this.chatContent.addChild(chatItem);

        this.limitChatHistory();

        this.scheduleOnce(() => {
            this.scrollToBottom();
        }, 0.05);

        if (!this.editBox.node.active) {
            this.showChatUI();
            this.startHideTimer();
        }
    },

    limitChatHistory() {
        if (this.chatContent.childrenCount > this.maxMessages) {
            const excess = this.chatContent.childrenCount - this.maxMessages;
            for (let i = 0; i < excess; i++) {
                const oldestChild = this.chatContent.children[0];
                if (oldestChild) {
                    oldestChild.destroy();
                }
            }
        }
    },

    loadChatHistory(messages) {
        if (!messages || !Array.isArray(messages)) return;
        
        this.clearChatHistory();
        
        messages.forEach(msg => {
            this.displayChatMessage(msg);
        });
        
        this.displaySystemMessage('Chat history loaded', cc.Color.GREEN);
    },

    onEditBoxBlur() {
        this._justBlurred = true;
        if (!this._blurredByEnter) {
            this._lastBlurTime = Date.now();
        }
        this.startHideTimer();

        this.scheduleOnce(() => {
            this._justBlurred = false;
        }, 0.2);
    },

    onUserInteraction() {
        this.resetBlurState();
        this._lastBlurTime = 0;
    },

    scrollToBottom() {
        if (!this.scrollView) return;

        const scrollViewComp = this.scrollView.getComponent(cc.ScrollView);
        if (scrollViewComp) {
            this.scheduleOnce(() => {
                scrollViewComp.scrollToBottom(0.2);
            }, 0.05);
        }
    },

    setUsername(username) {
        this.username = username;
        window.currentUsername = username;
        window.currentPlayerName = username;
    },

    setCurrentRoom(roomId) {
        this.currentRoom = roomId;
        window.currentRoomId = roomId;
        
        this.requestChatHistory();
    },

    requestChatHistory() {
        if (this.socket && this.currentRoom) {
            this.socket.emit('get-chat-history', {
                roomId: this.currentRoom,
                playerId: this.playerId,
                limit: this.maxMessages
            });
        }
    },

    clearChatHistory() {
        if (this.chatContent) {
            this.chatContent.removeAllChildren();
        }
    },

    showWelcomeMessage() {
        if (!this.username) return;
        
        this.displaySystemMessage(
            `Welcome ${this.username}! Press Enter to chat.`, 
            cc.Color.GREEN
        );
    },

    reconnect() {
        this.displaySystemMessage('Attempting to reconnect...', cc.Color.YELLOW);
        this.initializeSocket();
    },

    handleCommand(message) {
        if (!message.startsWith('/')) return false;
        
        const parts = message.slice(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        switch (command) {
            case 'clear':
                this.clearChatHistory();
                this.displaySystemMessage('Chat cleared', cc.Color.GREEN);
                return true;
                
            case 'help':
                this.showHelpMessage();
                return true;
                
            case 'ping':
                this.displaySystemMessage(`Pong! Latency: ${Date.now() - this.lastPingTime}ms`, cc.Color.CYAN);
                return true;
                
            case 'time':
                this.displaySystemMessage(`Current time: ${new Date().toLocaleString()}`, cc.Color.CYAN);
                return true;
                
            default:
                this.displaySystemMessage(`Unknown command: /${command}. Type /help for available commands.`, cc.Color.RED);
                return true;
        }
    },

    showHelpMessage() {
        const helpText = [
            'Available commands:',
            '/clear - Clear chat history',
            '/help - Show this help message',
            '/ping - Check connection latency',
            '/time - Show current time',
            'Press Enter to toggle chat',
            'Press Escape to hide chat'
        ];
        
        helpText.forEach(text => {
            this.displaySystemMessage(text, cc.Color.CYAN);
        });
    },

    cleanup() {
        this.clearHideTimer();
        
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        
        if (this.node.parent) {
            this.node.parent.off(cc.Node.EventType.TOUCH_START, this.onUserInteraction, this);
        }

        if (this.socket) {
            this.socket.off('chat-message');
            this.socket.off('chat-error');
            this.socket.off('player-joined');
            this.socket.off('player-left');
            this.socket.off('chat-history');
            this.socket.off('connect');
            this.socket.off('disconnect');
        }
        
        this.messageQueue = [];
    },

    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            hasSocket: !!this.socket,
            isConnected: this.socket?.connected || false,
            currentRoom: this.currentRoom,
            username: this.username,
            playerId: this.playerId,
            messageQueueLength: this.messageQueue.length,
            chatItemCount: this.chatContent?.childrenCount || 0
        };
    },

    logDebugInfo() {
        console.log('ChatPanel Debug Info:', this.getDebugInfo());
    }
});