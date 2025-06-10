const { ccclass, property } = cc._decorator;

@ccclass
export default class ChatController extends cc.Component {
  @property(cc.Node)
  chatPanelNode = null;

  socket = null;
  playerId = null;
  currentRoom = null;

  start() {
    this.initialize();
  }

  initialize() {
    this.socket = window.gameSocket;
    this.playerId = this.socket?.id;
    this.currentRoom = window.currentRoomId;

    this.setupChatPanel();
    this.setupChatEvents();
  }

  setupChatPanel() {
    if (this.chatPanelNode) {
      const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
      if (chatPanel) {
        // Set username for chat
        const playerName = window.currentPlayerName || `Player_${this.playerId?.substring(0, 4)}`;
        chatPanel.setUsername(playerName);

        // Show welcome message
        chatPanel.showWelcomeMessage();

        // Request chat history
        this.requestChatHistory();
      }
    }
  }

  setupChatEvents() {
    if (!this.socket) return;

    // Clear existing chat listeners
    this.socket.off('chat-history');
    this.socket.off('player-joined-chat');
    this.socket.off('player-left-chat');

    this.socket.on('chat-history', (data) => {
      if (data.roomId === this.currentRoom && this.chatPanelNode) {
        const chatPanel = this.chatPanelNode.getComponent('ChatPanel');
        if (chatPanel) {
          // Display chat history
          data.messages.forEach(message => {
            chatPanel.displayChatMessage(message);
          });
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
          chatPanel.displaySystemMessage(`${data.playerName} left the room`, cc.Color.RED);
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

  onDestroy() {
    if (this.socket) {
      this.socket.off('chat-history');
      this.socket.off('player-joined-chat');
      this.socket.off('player-left-chat');
    }
  }
}