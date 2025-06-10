cc.Class({
    extends: cc.Component,

    properties: {
        editBox: cc.EditBox,
        scrollView: cc.ScrollView,
        chatContent: cc.Node,
        chatItemPrefab: cc.Prefab,
        usernameLabel: cc.Label // Hiển thị username hiện tại
    },

    onLoad() {
        this.editBox.node.active = false;
        this.scrollView.node.active = false;

        this.hideTimer = null;
        this.HIDE_DELAY = 5;
        this._justBlurred = false;
        this._lastBlurTime = 0;
        this._blurredByEnter = false;

        // Socket và room info
        this.socket = null;
        this.currentRoom = null;
        this.username = null;

        // Initialize socket connection
        this.initializeSocket();

        // Event listeners
        this.editBox.node.on('editing-return', this.onSendMessage, this);
        this.editBox.node.on('editing-did-ended', this.onEditBoxBlur, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        this.node.parent.on(cc.Node.EventType.TOUCH_START, this.onUserInteraction, this);
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        this.node.parent.off(cc.Node.EventType.TOUCH_START, this.onUserInteraction, this);
        this.clearHideTimer();

        // Clean up socket events
        if (this.socket) {
            this.socket.off('chat-message');
            this.socket.off('chat-error');
            this.socket.off('player-joined');
            this.socket.off('player-left');
        }
    },

    initializeSocket() {
        // Lấy socket từ global hoặc GameController
        this.socket = window.gameSocket;
        this.currentRoom = window.currentRoomId;

        if (!this.socket) {
            console.error('No socket connection found');
            return;
        }

        // Get username from socket ID or stored username
        this.username = window.currentUsername || `Player_${this.socket.id?.substring(0, 4)}`;

        // Update username display
        if (this.usernameLabel) {
            this.usernameLabel.string = this.username;
        }

        this.setupSocketEvents();
    },

    setupSocketEvents() {
        if (!this.socket) return;

        // Listen for incoming chat messages
        this.socket.on('chat-message', (data) => {
            this.displayChatMessage(data);
        });

        // Listen for chat errors
        this.socket.on('chat-error', (data) => {
            this.displaySystemMessage(`Chat Error: ${data.message}`, cc.Color.RED);
        });

        // Listen for player join/leave notifications
        this.socket.on('player-joined', (data) => {
            if (data.playerId !== this.socket.id) {
                this.displaySystemMessage(`${data.playerName} joined the room`, cc.Color.GREEN);
            }
        });

        this.socket.on('player-left', (data) => {
            if (data.playerId !== this.socket.id) {
                this.displaySystemMessage(`${data.playerName} left the room`, cc.Color.ORANGE);
            }
        });
    },

    onKeyDown(event) {
        if (event.keyCode === cc.macro.KEY.enter) {
            const currentTime = Date.now();

            if (!this.editBox.node.active) {
                // Nếu UI đang ẩn -> hiển thị và focus
                this.showChatUI();
                this.editBox.focus();
                this._justBlurred = false;
                this._blurredByEnter = false;
            } else if (!this.editBox.isFocused()) {
                // Nếu hiện nhưng chưa focus
                if (this._blurredByEnter || currentTime - this._lastBlurTime > 200) {
                    this.scheduleOnce(() => {
                        this.editBox.focus();
                    }, 0.1);
                    this._justBlurred = false;
                    this._blurredByEnter = false;
                }
            } else {
                // Nếu đang focus
                const msg = this.editBox.string.trim();
                if (msg.length === 0) {
                    this._blurredByEnter = true;
                    this.editBox.blur();
                    this._justBlurred = true;
                    this._lastBlurTime = currentTime;
                }
            }
        }
    },

    showChatUI() {
        this.editBox.node.active = true;
        this.scrollView.node.active = true;
        this.clearHideTimer();
    },

    hideChatUI() {
        this.editBox.node.active = false;
        this.scrollView.node.active = false;
        this.clearHideTimer();
    },

    startHideTimer() {
        this.clearHideTimer();
        this.hideTimer = setTimeout(() => {
            this.hideChatUI();
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

        // Validate message length
        if (msg.length > 200) {
            this.displaySystemMessage('Message too long (max 200 characters)', cc.Color.RED);
            return;
        }

        // Send message to server
        this.sendChatMessage(msg);

        // Clear input and refocus
        this.editBox.string = "";
        this.scheduleOnce(() => {
            this.editBox.focus();
        }, 0.1);
    },

    sendChatMessage(message) {
        if (!this.socket || !this.currentRoom || !this.username) {
            this.displaySystemMessage('Cannot send message: No connection', cc.Color.RED);
            return;
        }

        const chatData = {
            roomId: this.currentRoom,
            playerId: this.socket.id,
            username: this.username,
            message: message,
            timestamp: Date.now()
        };

        this.socket.emit('chat-message', chatData);
    },

    displayChatMessage(data) {
        if (!this.chatItemPrefab || !this.chatContent) return;

        const chatItem = cc.instantiate(this.chatItemPrefab);
        const label = chatItem.getComponentInChildren(cc.Label);

        if (label) {
            // Format: [Username]: Message
            const displayText = `${data.username}: ${data.message}`;
            label.string = displayText;

            // Color coding: own messages vs others
            if (data.playerId === this.socket.id) {
                label.node.color = cc.Color.CYAN; // Own messages in cyan
            } else {
                label.node.color = cc.Color.WHITE; // Others in white
            }
        }

        this.addChatItem(chatItem);
    },

    displaySystemMessage(message, color = cc.Color.YELLOW) {
        if (!this.chatItemPrefab || !this.chatContent) return;

        const chatItem = cc.instantiate(this.chatItemPrefab);
        const label = chatItem.getComponentInChildren(cc.Label);

        if (label) {
            label.string = `[System] ${message}`;
            label.node.color = color;
            label.fontSize = label.fontSize * 0.9; // Slightly smaller for system messages
        }

        this.addChatItem(chatItem);
    },

    addChatItem(chatItem) {
        this.chatContent.addChild(chatItem);

        // Limit chat history (remove oldest messages)
        const maxMessages = 50;
        if (this.chatContent.childrenCount > maxMessages) {
            const oldestChild = this.chatContent.children[0];
            oldestChild.destroy();
        }

        this.scheduleOnce(() => {
            this.scrollView.scrollToBottom(0.2);
        }, 0.05);

        // Show chat UI when new message arrives
        if (!this.editBox.node.active) {
            this.showChatUI();
            this.startHideTimer();
        }
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
        this._justBlurred = false;
        this._lastBlurTime = 0;
        this._blurredByEnter = false;
    },

    // Public methods for external control
    setUsername(username) {
        this.username = username;
        window.currentUsername = username;
        if (this.usernameLabel) {
            this.usernameLabel.string = username;
        }
    },

    clearChatHistory() {
        if (this.chatContent) {
            this.chatContent.removeAllChildren();
        }
    },

    // Add a welcome message when joining room
    showWelcomeMessage() {
        this.displaySystemMessage(`Welcome to the room! You are: ${this.username}`, cc.Color.GREEN);
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
});