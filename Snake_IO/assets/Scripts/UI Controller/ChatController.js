const { ccclass, property } = cc._decorator;

@ccclass
export default class ChatController extends cc.Component {
  @property(cc.Node)
  chatPanelNode = null;

  socket = null;
  playerId = null;
  currentRoom = null;
  playerName = null; 
  start() {
    this.initialize();
  }

  initialize() {
    this.socket = window.gameSocket;
    this.playerId = this.socket?.id;
    this.currentRoom = window.currentRoomId;
    
    this.playerName = window.currentPlayerName || this.getPlayerNameFromRoomData();

    this.setupChatPanel();
    this.setupChatEvents();
  }

  getPlayerNameFromRoomData() {
    const roomData = window.roomData;
    if (roomData && roomData.players) {
      const currentPlayer = roomData.players.find(player => player.id === this.playerId);
      return currentPlayer ? currentPlayer.name : `Player_${this.playerId?.substring(0, 4)}`;
    }
    return `Player_${this.playerId?.substring(0, 4)}`;
  }

  setupChatPanel() {
    if (this.chatPanelNode) {
      const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
      if (chatPanel) {
        chatPanel.setUsername(this.playerName);

        chatPanel.showWelcomeMessage();

        this.requestChatHistory();

        this.setupChatMessageSending(chatPanel);
      }
    }
  }

  setupChatMessageSending(chatPanel) {
    chatPanel.sendMessage = (message) => {
      if (!message || !message.trim()) return;

      this.sendChatMessage(message.trim());
    };
  }

  sendChatMessage(message) {
    if (!this.socket || !this.currentRoom || !message) return;

    const chatData = {
      roomId: this.currentRoom,
      playerId: this.playerId,
      username: this.playerName,
      message: message
    };

    this.socket.emit('chat-message', chatData);
  }

  setupChatEvents() {
    if (!this.socket) return;

    this.socket.off('chat-message');
    this.socket.off('chat-history');
    this.socket.off('chat-error');
    this.socket.off('player-joined-chat');
    this.socket.off('player-left-chat');

    this.socket.on('chat-message', (data) => {
      if (data.roomId === this.currentRoom && this.chatPanelNode) {
        const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
        if (chatPanel) {
          chatPanel.displayChatMessage(data);
        }
      }
    });

    this.socket.on('chat-history', (data) => {
      if (data.roomId === this.currentRoom && this.chatPanelNode) {
        const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
        if (chatPanel) {
          data.messages.forEach(message => {
            chatPanel.displayChatMessage(message);
          });

          chatPanel.scrollToBottom();
        }
      }
    });

    this.socket.on('chat-error', (data) => {
      if (this.chatPanelNode) {
        const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
        if (chatPanel) {
          chatPanel.displaySystemMessage(data.message, cc.Color.RED);
        }
      }
    });

    this.socket.on('player-joined-chat', (data) => {
      if (this.chatPanelNode) {
        const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
        if (chatPanel) {
          chatPanel.displaySystemMessage(`${data.playerName} joined the room`, cc.Color.GREEN);
        }
      }
    });

    this.socket.on('player-left-chat', (data) => {
      if (this.chatPanelNode) {
        const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
        if (chatPanel) {
          chatPanel.displaySystemMessage(`${data.playerName} left the room`, cc.Color.ORANGE);
        }
      }
    });
  }

  requestChatHistory() {
    if (this.socket && this.currentRoom) {
      this.socket.emit('request-chat-history', {
        roomId: this.currentRoom,
        playerId: this.playerId
      });
    }
  }

  displaySystemMessage(message, color = cc.Color.YELLOW) {
    if (this.chatPanelNode) {
      const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
      if (chatPanel) {
        chatPanel.displaySystemMessage(message, color);
      }
    }
  }

  clearChatHistory() {
    if (this.chatPanelNode) {
      const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
      if (chatPanel) {
        chatPanel.clearChatHistory();
      }
    }
  }

  updatePlayerName(newName) {
    this.playerName = newName;
    window.currentPlayerName = newName; 
    
    if (this.chatPanelNode) {
      const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
      if (chatPanel) {
        chatPanel.setUsername(this.playerName);
      }
    }
  }

  onDestroy() {
    if (this.socket) {
      this.socket.off('chat-message');
      this.socket.off('chat-history');
      this.socket.off('chat-error');
      this.socket.off('player-joined-chat');
      this.socket.off('player-left-chat');
    }
  }
}