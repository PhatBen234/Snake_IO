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

  onLoad() {
    this.initializeComponents();
    this.setupEventHandlers();
    this.connectToServer();
  }

  initializeComponents() {
    this.socketManager = new SocketManager();
    this.uiController = this.getComponent(UIController);
  }

  setupEventHandlers() {
    // Socket events
    this.socketManager.on("connect", (data) => {
      this.roomDataManager = new RoomDataManager(data.playerId);
      this.uiController.updateStatus("Đã kết nối server");
      this.uiController.setButtonsEnabled(true);
    });

    this.socketManager.on("room-created", (data) => {
      this.handleRoomJoined(data, "Đã tạo phòng thành công");
    });

    this.socketManager.on("joined-room", (data) => {
      this.handleRoomJoined(data, "Đã vào phòng thành công");
    });

    this.socketManager.on("player-joined", (data) => {
      this.updateRoomIfExists(data.roomData);
    });

    this.socketManager.on("player-left", (data) => {
      this.updateRoomIfExists(data.roomData);
    });

    this.socketManager.on("new-host", (data) => {
      if (data.newHostId === this.socketManager.getPlayerId()) {
        this.roomDataManager.setAsHost(true);
        this.uiController.updateStatus("Bạn đã trở thành chủ phòng mới!");
      }
      this.updateRoomIfExists(data.roomData);
    });

    this.socketManager.on("game-started", () => {
      this.uiController.updateStatus("Game đã bắt đầu! Đang tải...");
      this.saveGameData();
      this.loadGameScene();
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
      this.uiController.updateStatus("Mất kết nối server");
      this.uiController.setButtonsEnabled(false);
      this.uiController.showJoinPanel();
    });

    // UI events
    this.uiController.on("createRoom", (data) =>
      this.createRoom(data.playerName)
    );
    this.uiController.on("joinRoom", (data) =>
      this.joinRoom(data.roomId, data.playerName)
    );
    this.uiController.on("startGame", () => this.startGame());
    this.uiController.on("leaveRoom", () => this.leaveRoom());
  }

  connectToServer() {
    this.socketManager.connectToServer();
  }

  handleRoomJoined(data, statusMessage) {
    this.roomDataManager.setRoomData(data.roomId, data.roomData, data.isHost);
    this.uiController.showLobbyPanel();
    this.updateUIRoomInfo();
    this.uiController.updateStatus(statusMessage);
  }

  updateRoomIfExists(roomData) {
    if (this.roomDataManager?.getRoomData()) {
      this.roomDataManager.updateRoomData(roomData);
      this.updateUIRoomInfo();
    }
  }

  createRoom(playerName) {
    if (!this.validateConnection()) return;

    this.uiController.updateStatus("Đang tạo phòng...");
    this.socketManager.emit("create-room", {
      playerId: this.socketManager.getPlayerId(),
      playerName: playerName,
    });
  }

  joinRoom(roomId, playerName) {
    if (!this.validateConnection()) return;

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

    this.socketManager.emit("leave-room", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerId: this.socketManager.getPlayerId(),
    });

    this.roomDataManager.clearRoom();
    this.uiController.showJoinPanel();
    this.uiController.updateStatus("Đã rời khỏi phòng");
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

  updateUIRoomInfo() {
    this.uiController.updateRoomInfo(
      this.roomDataManager.getCurrentRoom(),
      this.roomDataManager.getRoomData(),
      this.roomDataManager.getIsHost(),
      this.socketManager.getPlayerId()
    );
  }

  saveGameData() {
    window.gameSocket = this.socketManager.socket;
    window.currentRoomId = this.roomDataManager.getCurrentRoom();
    window.currentPlayerId = this.socketManager.getPlayerId();
    window.roomData = this.roomDataManager.getRoomData();
  }

  loadGameScene() {
    this.uiController.hideUI();

    setTimeout(() => {
      cc.director.loadScene("GameScene", (err) => {
        if (err) {
          this.uiController.updateStatus("Lỗi khi tải game!");
          this.uiController.showUI();
        }
      });
    }, 500);
  }
}
