// LobbyWithChat.js - Tích hợp chat vào lobby scene
import SocketManager from "./SocketManager";
import RoomDataManager from "./RoomDataManager";
import UIController from "./UIController";

const { ccclass, property } = cc._decorator;

@ccclass
export default class LobbyWithChat extends cc.Component {
  @property(cc.Node)
  chatPanelNode = null; // Chat panel node reference
  
  @property(cc.Node)
  lobbyUI = null; // Lobby UI node reference

  socketManager = null;
  roomDataManager = null;
  uiController = null;
  currentPlayerName = null;
  gameSceneLoading = false;
  
  // Chat-related properties
  chatPanel = null;

  onLoad() {
    this.initializeComponents();
    this.setupEventHandlers();
    this.setupChatSystem();
    this.connectToServer();
  }

  initializeComponents() {
    this.socketManager = new SocketManager();
    this.uiController = this.getComponent(UIController);
    
    // Initialize chat panel if exists
    if (this.chatPanelNode) {
      this.chatPanel = this.chatPanelNode.getComponent('ChatPanel');
      if (!this.chatPanel) {
        console.error('ChatPanel component not found on chatPanelNode');
      }
    }
  }

  setupChatSystem() {
    if (!this.chatPanel) return;

    // Hide chat initially
    this.chatPanelNode.active = false;
    
    // Setup chat panel initialization callback
    this.chatPanel.onChatReady = () => {
      if (this.currentPlayerName) {
        this.chatPanel.setUsername(this.currentPlayerName);
        this.chatPanel.displaySystemMessage(
          `Lobby chat ready. Welcome ${this.currentPlayerName}!`, 
          cc.Color.GREEN
        );
      }
    };
  }

  setupEventHandlers() {
    // Socket events
    this.socketManager.on("connect", (data) => {
      this.roomDataManager = new RoomDataManager(data.playerId);
      this.uiController.updateStatus("Đã kết nối server");
      this.uiController.setButtonsEnabled(true);
      
      // Update global references for chat
      this.updateGlobalChatReferences(data.playerId);
    });

    this.socketManager.on("room-created", (data) => {
      this.handleRoomJoined(data, "Đã tạo phòng thành công");
    });

    this.socketManager.on("joined-room", (data) => {
      this.handleRoomJoined(data, "Đã vào phòng thành công");
    });

    this.socketManager.on("player-joined", (data) => {
      this.updateRoomIfExists(data.roomData);
      this.notifyPlayerJoined(data);
    });

    this.socketManager.on("player-left", (data) => {
      this.updateRoomIfExists(data.roomData);
      this.notifyPlayerLeft(data);
    });

    this.socketManager.on("new-host", (data) => {
      this.handleHostChange(data);
    });

    this.socketManager.on("game-started", () => {
      this.handleGameStarted();
    });

    this.socketManager.on("room-full", () => {
      this.uiController.updateStatus("Phòng đã đầy!");
    });

    this.socketManager.on("join-failed", (data) => {
      this.uiController.updateStatus(`Không thể vào phòng: ${data.reason}`);
    });

    this.socketManager.on("create-failed", (data) => {
      this.uiController.updateStatus(`Không thể tạo phòng: ${data.reason}`);
    });

    this.socketManager.on("disconnect", () => {
      this.handleDisconnection();
    });

    // Chat-specific socket events
    this.setupChatSocketEvents();

    // UI events
    this.uiController.on("createRoom", (data) =>
      this.createRoom(data.playerName, data.playerLimit)
    );
    this.uiController.on("joinRoom", (data) =>
      this.joinRoom(data.roomId, data.playerName)
    );
    this.uiController.on("startGame", () => this.startGame());
    this.uiController.on("leaveRoom", () => this.leaveRoom());
  }

  setupChatSocketEvents() {
    if (!this.socketManager) return;

    // Chat message handling
    this.socketManager.on("chat-message", (data) => {
      if (this.chatPanel && data.roomId === this.roomDataManager?.getCurrentRoom()) {
        this.chatPanel.displayChatMessage(data);
      }
    });

    // Chat error handling
    this.socketManager.on("chat-error", (data) => {
      if (this.chatPanel) {
        this.chatPanel.displaySystemMessage(`Chat Error: ${data.message}`, cc.Color.RED);
      }
    });

    // Chat history response
    this.socketManager.on("chat-history", (data) => {
      if (this.chatPanel && data.roomId === this.roomDataManager?.getCurrentRoom()) {
        this.loadChatHistory(data.messages);
      }
    });
  }

  updateGlobalChatReferences(playerId) {
    window.gameSocket = this.socketManager.socket;
    window.currentPlayerId = playerId;
    
    // Update chat panel's socket reference
    if (this.chatPanel) {
      this.chatPanel.socket = this.socketManager.socket;
      this.chatPanel.playerId = playerId;
    }
  }

  connectToServer() {
    this.socketManager.connectToServer();
  }

  handleRoomJoined(data, statusMessage) {
    this.roomDataManager.setRoomData(data.roomId, data.roomData, data.isHost);
    this.uiController.showLobbyPanel();
    this.updateUIRoomInfo();
    this.uiController.updateStatus(statusMessage);

    // Store current player info
    const currentPlayer = data.roomData.players.find(
      (p) => p.id === this.socketManager.getPlayerId()
    );
    
    if (currentPlayer) {
      this.currentPlayerName = currentPlayer.name;
      this.savePlayerName(this.currentPlayerName);
      this.updateChatSystemInfo(data.roomId, this.currentPlayerName);
    }

    // Show and initialize chat
    this.showChatPanel();
    this.requestChatHistory(data.roomId);
  }

  updateChatSystemInfo(roomId, playerName) {
    // Update global variables
    window.currentRoomId = roomId;
    window.currentPlayerName = playerName;
    window.currentUsername = playerName;
    
    // Update chat panel
    if (this.chatPanel) {
      this.chatPanel.currentRoom = roomId;
      this.chatPanel.username = playerName;
      this.chatPanel.setUsername(playerName);
      
      // Show welcome message
      this.scheduleOnce(() => {
        this.chatPanel.showWelcomeMessage();
        this.displayRoomInfo();
      }, 0.5);
    }
  }

  displayRoomInfo() {
    if (!this.chatPanel || !this.roomDataManager) return;
    
    const roomData = this.roomDataManager.getRoomData();
    if (roomData) {
      const playerCount = roomData.players.length;
      const maxPlayers = roomData.playerLimit;
      const roomId = this.roomDataManager.getCurrentRoom();
      
      this.chatPanel.displaySystemMessage(
        `Room ${roomId} (${playerCount}/${maxPlayers} players)`,
        cc.Color.YELLOW
      );
    }
  }

  showChatPanel() {
    if (this.chatPanelNode) {
      this.chatPanelNode.active = true;
      
      if (this.chatPanel) {
        // Initialize chat UI
        this.chatPanel.showChatUI();
        
        // Trigger ready callback if exists
        if (typeof this.chatPanel.onChatReady === 'function') {
          this.chatPanel.onChatReady();
        }
      }
    }
  }

  hideChatPanel() {
    if (this.chatPanelNode) {
      this.chatPanelNode.active = false;
    }
  }

  requestChatHistory(roomId) {
    if (this.socketManager && roomId) {
      this.socketManager.emit("get-chat-history", {
        roomId: roomId,
        playerId: this.socketManager.getPlayerId()
      });
    }
  }

  loadChatHistory(messages) {
    if (!this.chatPanel || !messages) return;
    
    // Clear existing messages
    this.chatPanel.clearChatHistory();
    
    // Load historical messages
    messages.forEach(msg => {
      this.chatPanel.displayChatMessage(msg);
    });
  }

  notifyPlayerJoined(data) {
    if (data.roomData && data.playerName && this.chatPanel) {
      // Don't notify about own join
      if (data.playerId !== this.socketManager.getPlayerId()) {
        this.chatPanel.displaySystemMessage(
          `${data.playerName} joined the room`, 
          cc.Color.GREEN
        );
      }
    }
  }

  notifyPlayerLeft(data) {
    if (data.roomData && data.playerName && this.chatPanel) {
      // Don't notify about own leave
      if (data.playerId !== this.socketManager.getPlayerId()) {
        this.chatPanel.displaySystemMessage(
          `${data.playerName} left the room`, 
          cc.Color.ORANGE
        );
      }
    }
  }

  handleHostChange(data) {
    if (data.newHostId === this.socketManager.getPlayerId()) {
      this.roomDataManager.setAsHost(true);
      this.uiController.updateStatus("Bạn đã trở thành chủ phòng mới!");
      
      if (this.chatPanel) {
        this.chatPanel.displaySystemMessage(
          "You are now the room host!", 
          cc.Color.CYAN
        );
      }
    }
    this.updateRoomIfExists(data.roomData);
  }

  handleGameStarted() {
    this.uiController.updateStatus("Game đã bắt đầu! Đang tải...");

    if (this.chatPanel) {
      this.chatPanel.displaySystemMessage(
        "Game is starting! Good luck everyone!", 
        cc.Color.CYAN
      );
    }

    this.saveGameData();
    this.loadGameScene();
  }

  handleDisconnection() {
    this.uiController.updateStatus("Mất kết nối server");
    this.uiController.setButtonsEnabled(false);
    this.uiController.showJoinPanel();
    
    if (this.chatPanel) {
      this.chatPanel.displaySystemMessage(
        "Disconnected from server", 
        cc.Color.RED
      );
    }
    
    this.hideChatPanel();
  }

  updateRoomIfExists(roomData) {
    if (this.roomDataManager?.getRoomData()) {
      this.roomDataManager.updateRoomData(roomData);
      this.updateUIRoomInfo();

      // Update player name if changed
      const currentPlayer = roomData.players.find(
        (p) => p.id === this.socketManager.getPlayerId()
      );
      
      if (currentPlayer && currentPlayer.name !== this.currentPlayerName) {
        this.currentPlayerName = currentPlayer.name;
        this.savePlayerName(this.currentPlayerName);
        
        if (this.chatPanel) {
          this.chatPanel.setUsername(this.currentPlayerName);
        }
      }
    }
  }

  createRoom(playerName, playerLimit = 4) {
    if (!this.validateConnection()) return;
    if (!this.validatePlayerLimit(playerLimit)) return;

    this.currentPlayerName = playerName;
    this.savePlayerName(playerName);

    this.uiController.updateStatus("Đang tạo phòng...");
    this.socketManager.emit("create-room", {
      playerId: this.socketManager.getPlayerId(),
      playerName: playerName,
      playerLimit: playerLimit,
    });
  }

  joinRoom(roomId, playerName) {
    if (!this.validateConnection()) return;

    this.currentPlayerName = playerName;
    this.savePlayerName(playerName);

    this.uiController.updateStatus("Đang vào phòng...");
    this.socketManager.emit("join-room", {
      roomId: roomId,
      playerId: this.socketManager.getPlayerId(),
      playerName: playerName,
    });
  }

  startGame() {
    if (!this.validateGameStart()) return;

    this.uiController.updateStatus("Đang bắt đầu game...");
    this.socketManager.emit("start-game", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerId: this.socketManager.getPlayerId(),
    });
  }

  leaveRoom() {
    if (!this.validateConnection() || !this.roomDataManager?.getCurrentRoom())
      return;

    // Notify other players via chat
    if (this.chatPanel) {
      this.socketManager.emit("chat-message", {
        roomId: this.roomDataManager.getCurrentRoom(),
        playerId: this.socketManager.getPlayerId(),
        username: this.currentPlayerName,
        message: `${this.currentPlayerName} is leaving the room`,
        isSystemMessage: true
      });
    }

    this.socketManager.emit("leave-room", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerId: this.socketManager.getPlayerId(),
    });

    this.roomDataManager.clearRoom();
    this.uiController.showJoinPanel();
    this.uiController.updateStatus("Đã rời khỏi phòng");
    
    // Hide and clear chat
    this.hideChatPanel();
    if (this.chatPanel) {
      this.chatPanel.clearChatHistory();
    }
  }

  validateConnection() {
    if (!this.socketManager.isConnected()) {
      this.uiController.updateStatus("Chưa kết nối tới server!");
      return false;
    }
    return true;
  }

  validateGameStart() {
    if (
      !this.validateConnection() ||
      !this.roomDataManager?.getCurrentRoom() ||
      !this.roomDataManager.getIsHost()
    ) {
      return false;
    }

    if (this.roomDataManager.getPlayerCount() < 2) {
      this.uiController.updateStatus("Cần ít nhất 2 người chơi để bắt đầu!");
      return false;
    }

    return true;
  }

  validatePlayerLimit(limit) {
    if (typeof limit !== "number" || isNaN(limit) || limit < 2 || limit > 4) {
      this.uiController.updateStatus("Giới hạn người chơi phải từ 2 đến 4!");
      return false;
    }
    return true;
  }

  updateUIRoomInfo() {
    this.uiController.updateRoomInfo(
      this.roomDataManager.getCurrentRoom(),
      this.roomDataManager.getRoomData(),
      this.roomDataManager.getIsHost(),
      this.socketManager.getPlayerId()
    );
    
    // Update chat with room info periodically
    this.displayRoomInfo();
  }

  savePlayerName(playerName) {
    window.currentPlayerName = playerName;
    window.currentUsername = playerName;
  }

  saveGameData() {
    window.gameSocket = this.socketManager.socket;
    window.currentRoomId = this.roomDataManager.getCurrentRoom();
    window.currentPlayerId = this.socketManager.getPlayerId();
    window.roomData = this.roomDataManager.getRoomData();
    window.currentPlayerName = this.currentPlayerName;
    window.currentUsername = this.currentPlayerName;
  }

  loadGameScene() {
    if (this.gameSceneLoading) return;

    this.gameSceneLoading = true;
    this.uiController.hideUI();

    // Notify chat about scene transition
    if (this.chatPanel) {
      this.chatPanel.displaySystemMessage(
        "Loading game scene...", 
        cc.Color.YELLOW
      );
    }

    setTimeout(() => {
      cc.director.loadScene("GameScene", (err) => {
        if (err) {
          this.uiController.updateStatus("Lỗi khi tải game!");
          this.uiController.showUI();
          this.gameSceneLoading = false;
          
          if (this.chatPanel) {
            this.chatPanel.displaySystemMessage(
              "Failed to load game scene", 
              cc.Color.RED
            );
          }
        } else {
          console.log("Game scene loaded successfully!");
        }
      });
    }, 500);
  }

  onDestroy() {
    // Clean up chat system
    if (this.chatPanel) {
      this.chatPanel.clearChatHistory();
    }
    
    // Clean up socket events
    if (this.socketManager) {
      this.socketManager.disconnect();
    }
    
    // Clear global references
    window.gameSocket = null;
    window.currentRoomId = null;
    window.currentPlayerId = null;
    window.currentPlayerName = null;
    window.currentUsername = null;
  }
}