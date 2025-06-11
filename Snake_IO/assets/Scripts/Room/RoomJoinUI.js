// RoomJoinUI.js
import SocketManager from "./SocketManager";
import RoomDataManager from "./RoomDataManager";
import UIController from "./UIController";

const { ccclass } = cc._decorator;

@ccclass
export default class RoomJoinUI extends cc.Component {
  socketManager = null;
  roomDataManager = null;
  uiController = null;
  currentPlayerName = null; // Store current player name
  gameSceneLoading = false; // Flag to prevent multiple scene loads

  onLoad() {
    // Initialize SocketManager immediately
    this.socketManager = new SocketManager();
  }

  start() {
    // Use start() instead of onLoad() to ensure UIController is initialized
    this.initializeComponents();
    this.setupEventHandlers();
    this.connectToServer();
  }

  initializeComponents() {
    // UIController should be available now
    this.uiController = this.getComponent(UIController);

    if (!this.uiController) {
      console.error("UIController component not found!");
      return;
    }
  }

  setupEventHandlers() {
    // Socket events - bind this context to avoid null reference
    this.socketManager.on("connect", (data) => {
      if (!this.socketManager) return;
      this.roomDataManager = new RoomDataManager(data.playerId);
      if (this.uiController) {
        this.uiController.updateStatus("Đã kết nối server");
        this.uiController.setButtonsEnabled(true);
      }
    });

    this.socketManager.on("room-created", (data) => {
      if (!this.socketManager) return;
      this.handleRoomJoined(data, "Đã tạo phòng thành công");
    });

    this.socketManager.on("joined-room", (data) => {
      if (!this.socketManager) return;
      this.handleRoomJoined(data, "Đã vào phòng thành công");
    });

    this.socketManager.on("player-joined", (data) => {
      if (!this.socketManager) return;
      this.updateRoomIfExists(data.roomData);

      // Send chat notification about player joining
      if (data.roomData && data.playerName && this.socketManager) {
        this.socketManager.emit("join-room", {
          roomId: data.roomData.id,
          playerName: data.playerName,
        });
      }
    });

    this.socketManager.on("player-left", (data) => {
      if (!this.socketManager) return;
      this.updateRoomIfExists(data.roomData);

      // Send chat notification about player leaving
      if (data.roomData && data.playerName && this.socketManager) {
        this.socketManager.emit("quit-room", {
          roomId: data.roomData.id,
          playerName: data.playerName,
        });
      }
    });

    this.socketManager.on("new-host", (data) => {
      if (!this.socketManager) return;
      if (data.newHostId === this.socketManager.getPlayerId()) {
        this.roomDataManager.setAsHost(true);
        if (this.uiController) {
          this.uiController.updateStatus("Bạn đã trở thành chủ phòng mới!");
        }
      }
      this.updateRoomIfExists(data.roomData);
    });

    this.socketManager.on("game-started", () => {
      if (!this.socketManager) return;
      if (this.uiController) {
        this.uiController.updateStatus("Game đã bắt đầu! Đang tải...");
      }

      // Send game start notification to chat
      if (this.roomDataManager && this.socketManager) {
        this.socketManager.emit("start-game", {
          roomId: this.roomDataManager.getCurrentRoom(),
        });
      }

      this.saveGameData();
      this.loadGameScene();
    });

    this.socketManager.on("room-full", () => {
      if (!this.socketManager) return;
      if (this.uiController) {
        this.uiController.updateStatus("Phòng đã đầy!");
      }
    });

    this.socketManager.on("join-failed", (data) => {
      if (!this.socketManager) return;
      if (this.uiController) {
        this.uiController.updateStatus(`Không thể vào phòng: ${data.reason}`);
      }
    });

    this.socketManager.on("create-failed", (data) => {
      if (!this.socketManager) return;
      if (this.uiController) {
        this.uiController.updateStatus(`Không thể tạo phòng: ${data.reason}`);
      }
    });

    this.socketManager.on("disconnect", () => {
      if (!this.socketManager) return;
      if (this.uiController) {
        this.uiController.updateStatus("Mất kết nối server");
        this.uiController.setButtonsEnabled(false);
        this.uiController.showJoinPanel();
      }
    });

    // UI events
    if (this.uiController) {
      this.uiController.on("createRoom", (data) =>
        this.createRoom(data.playerName, data.playerLimit)
      );
      this.uiController.on("joinRoom", (data) =>
        this.joinRoom(data.roomId, data.playerName)
      );
      this.uiController.on("startGame", () => this.startGame());
      this.uiController.on("leaveRoom", () => this.leaveRoom());
    }
  }

  connectToServer() {
    this.socketManager.connectToServer();
  }

  handleRoomJoined(data, statusMessage) {
    if (!this.roomDataManager || !this.socketManager) return;

    this.roomDataManager.setRoomData(data.roomId, data.roomData, data.isHost);
    if (this.uiController) {
      this.uiController.showLobbyPanel();
      this.uiController.updateStatus(statusMessage);
    }
    this.updateUIRoomInfo();

    // Store current player name for chat system
    const currentPlayer = data.roomData.players.find(
      (p) => p.id === this.socketManager.getPlayerId()
    );
    if (currentPlayer) {
      this.currentPlayerName = currentPlayer.name;
      this.savePlayerName(this.currentPlayerName);
    }

    // Send join notification to chat
    if (this.socketManager && this.currentPlayerName) {
      this.socketManager.emit("join-room", {
        roomId: data.roomId,
        playerName: this.currentPlayerName,
      });
    }
  }

  updateRoomIfExists(roomData) {
    if (this.roomDataManager?.getRoomData()) {
      this.roomDataManager.updateRoomData(roomData);
      this.updateUIRoomInfo();

      // Update player name if it changed
      const currentPlayer = roomData.players.find(
        (p) => p.id === this.socketManager.getPlayerId()
      );
      if (currentPlayer && currentPlayer.name !== this.currentPlayerName) {
        this.currentPlayerName = currentPlayer.name;
        this.savePlayerName(this.currentPlayerName);
      }
    }
  }

  createRoom(playerName, playerLimit = 4) {
    if (!this.validateConnection()) return;

    // Validate player limit on client side
    if (!this.validatePlayerLimit(playerLimit)) return;

    // Store player name
    this.currentPlayerName = playerName;
    this.savePlayerName(playerName);

    if (this.uiController) {
      this.uiController.updateStatus("Đang tạo phòng...");
    }
    this.socketManager.emit("create-room", {
      playerId: this.socketManager.getPlayerId(),
      playerName: playerName,
      playerLimit: playerLimit,
    });
  }

  joinRoom(roomId, playerName) {
    if (!this.validateConnection()) return;

    // Store player name
    this.currentPlayerName = playerName;
    this.savePlayerName(playerName);

    if (this.uiController) {
      this.uiController.updateStatus("Đang vào phòng...");
    }
    this.socketManager.emit("join-room", {
      roomId: roomId,
      playerId: this.socketManager.getPlayerId(),
      playerName: playerName,
    });
  }

  startGame() {
    if (!this.validateGameStart()) return;

    if (this.uiController) {
      this.uiController.updateStatus("Đang bắt đầu game...");
    }
    this.socketManager.emit("start-game", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerId: this.socketManager.getPlayerId(),
    });
  }

  leaveRoom() {
    if (!this.validateConnection() || !this.roomDataManager?.getCurrentRoom())
      return;

    // Send leave notification to chat
    this.socketManager.emit("quit-room", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerName: this.currentPlayerName,
    });

    this.socketManager.emit("leave-room", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerId: this.socketManager.getPlayerId(),
    });

    this.roomDataManager.clearRoom();
    if (this.uiController) {
      this.uiController.showJoinPanel();
      this.uiController.updateStatus("Đã rời khỏi phòng");
    }
  }

  validateConnection() {
    if (!this.socketManager || !this.socketManager.isConnected()) {
      if (this.uiController) {
        this.uiController.updateStatus("Chưa kết nối tới server!");
      }
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
      if (this.uiController) {
        this.uiController.updateStatus("Cần ít nhất 2 người chơi để bắt đầu!");
      }
      return false;
    }

    return true;
  }

  validatePlayerLimit(limit) {
    if (typeof limit !== "number" || isNaN(limit) || limit < 2 || limit > 4) {
      if (this.uiController) {
        this.uiController.updateStatus("Giới hạn người chơi phải từ 2 đến 4!");
      }
      return false;
    }
    return true;
  }

  updateUIRoomInfo() {
    if (this.uiController && this.roomDataManager) {
      this.uiController.updateRoomInfo(
        this.roomDataManager.getCurrentRoom(),
        this.roomDataManager.getRoomData(),
        this.roomDataManager.getIsHost(),
        this.socketManager.getPlayerId()
      );
    }
  }

  // Save player name to global storage for chat system
  savePlayerName(playerName) {
    window.currentPlayerName = playerName;
  }

  saveGameData() {
    window.gameSocket = this.socketManager.socket;
    window.currentRoomId = this.roomDataManager.getCurrentRoom();
    window.currentPlayerId = this.socketManager.getPlayerId();
    window.roomData = this.roomDataManager.getRoomData();
    window.currentPlayerName = this.currentPlayerName; // Save player name
  }

  loadGameScene() {
    if (this.gameSceneLoading) {
      return; // Prevent multiple scene loads
    }

    this.gameSceneLoading = true;
    if (this.uiController) {
      this.uiController.hideUI();
    }

    setTimeout(() => {
      cc.director.loadScene("GameScene", (err) => {
        if (err) {
          if (this.uiController) {
            this.uiController.updateStatus("Lỗi khi tải game!");
            this.uiController.showUI();
          }
          this.gameSceneLoading = false; // Reset flag on error
        } else {
          console.log("Game scene loaded successfully!");
        }
      });
    }, 500);
  }
}
