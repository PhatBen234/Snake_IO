import SocketManager from './SocketManager';
import RoomDataManager from './RoomDataManager';
import UIController from './UIController';

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
    
    // Khởi tạo RoomDataManager sau khi có playerId
    this.socketManager.on('connect', (data) => {
      this.roomDataManager = new RoomDataManager(data.playerId);
    });
  }

  setupEventHandlers() {
    // Socket event handlers
    this.socketManager.on('connect', (data) => {
      this.uiController.updateStatus("Đã kết nối server");
      this.uiController.setButtonInteractable('join', true);
      this.uiController.setButtonInteractable('create', true);
    });

    this.socketManager.on('room-created', (data) => {
      this.roomDataManager.setRoomData(data.roomId, data.roomData, data.isHost);
      this.uiController.showLobbyPanel();
      this.updateUIRoomInfo();
      this.uiController.updateStatus("Đã tạo phòng thành công");
    });

    this.socketManager.on('joined-room', (data) => {
      this.roomDataManager.setRoomData(data.roomId, data.roomData, data.isHost);
      this.uiController.showLobbyPanel();
      this.updateUIRoomInfo();
      this.uiController.updateStatus("Đã vào phòng thành công");
    });

    this.socketManager.on('player-joined', (data) => {
      if (this.roomDataManager.getRoomData()) {
        this.roomDataManager.updateRoomData(data.roomData);
        this.updateUIRoomInfo();
      }
    });

    this.socketManager.on('player-left', (data) => {
      if (this.roomDataManager.getRoomData()) {
        this.roomDataManager.updateRoomData(data.roomData);
        this.updateUIRoomInfo();
      }
    });

    this.socketManager.on('new-host', (data) => {
      if (data.newHostId === this.socketManager.getPlayerId()) {
        this.roomDataManager.setAsHost(true);
        this.uiController.updateStatus("Bạn đã trở thành chủ phòng mới!");
      }
      if (this.roomDataManager.getRoomData()) {
        this.roomDataManager.updateRoomData(data.roomData);
        this.updateUIRoomInfo();
      }
    });

    this.socketManager.on('game-started', () => {
      this.uiController.updateStatus("Game đã bắt đầu!");
      this.uiController.hideUI();
    });

    this.socketManager.on('room-full', () => {
      this.uiController.updateStatus("Phòng đã đầy!");
    });

    this.socketManager.on('join-failed', (data) => {
      this.uiController.updateStatus(`Không thể vào phòng: ${data.reason}`);
    });

    this.socketManager.on('create-failed', (data) => {
      this.uiController.updateStatus(`Không thể tạo phòng: ${data.reason}`);
    });

    this.socketManager.on('disconnect', () => {
      this.uiController.updateStatus("Mất kết nối server");
      this.uiController.setButtonInteractable('join', false);
      this.uiController.setButtonInteractable('create', false);
      this.uiController.showJoinPanel();
    });

    // UI event handlers
    this.uiController.on('createRoom', (data) => {
      this.onCreateRoom(data.playerName);
    });

    this.uiController.on('joinRoom', (data) => {
      this.onJoinRoom(data.roomId, data.playerName);
    });

    this.uiController.on('startGame', () => {
      this.onStartGame();
    });

    this.uiController.on('leaveRoom', () => {
      this.onLeaveRoom();
    });
  }

  connectToServer() {
    this.socketManager.connectToServer();
  }

  onCreateRoom(playerName) {
    if (!this.socketManager.isConnected()) {
      this.uiController.updateStatus("Chưa kết nối tới server!");
      return;
    }

    this.uiController.updateStatus("Đang tạo phòng...");
    this.uiController.setButtonInteractable('create', false);

    console.log("🏠 Creating new room...");

    this.socketManager.emit("create-room", {
      playerId: this.socketManager.getPlayerId(),
      playerName: playerName,
    });

    setTimeout(() => {
      this.uiController.setButtonInteractable('create', true);
    }, 2000);
  }

  onJoinRoom(roomId, playerName) {
    if (!this.socketManager.isConnected()) {
      this.uiController.updateStatus("Chưa kết nối tới server!");
      return;
    }

    this.uiController.updateStatus("Đang vào phòng...");
    this.uiController.setButtonInteractable('join', false);

    console.log("📥 Attempting to join room:", roomId);

    this.socketManager.emit("join-room", {
      roomId: roomId,
      playerId: this.socketManager.getPlayerId(),
      playerName: playerName,
    });

    setTimeout(() => {
      this.uiController.setButtonInteractable('join', true);
    }, 2000);
  }

  onStartGame() {
    if (!this.socketManager.isConnected() || !this.roomDataManager.getCurrentRoom() || !this.roomDataManager.getIsHost()) {
      return;
    }

    if (this.roomDataManager.getPlayerCount() < 2) {
      this.uiController.updateStatus("Cần ít nhất 2 người chơi để bắt đầu!");
      return;
    }

    this.uiController.updateStatus("Đang bắt đầu game...");
    this.socketManager.emit("start-game", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerId: this.socketManager.getPlayerId(),
    });
  }

  onLeaveRoom() {
    if (!this.socketManager.isConnected() || !this.roomDataManager.getCurrentRoom()) {
      return;
    }

    this.socketManager.emit("leave-room", {
      roomId: this.roomDataManager.getCurrentRoom(),
      playerId: this.socketManager.getPlayerId(),
    });

    this.roomDataManager.clearRoom();
    this.uiController.showJoinPanel();
    this.uiController.updateStatus("Đã rời khỏi phòng");
  }

  updateUIRoomInfo() {
    this.uiController.updateRoomInfo(
      this.roomDataManager.getCurrentRoom(),
      this.roomDataManager.getRoomData(),
      this.roomDataManager.getIsHost(),
      this.socketManager.getPlayerId()
    );
  }

  onCopyRoomIdClick() {
    this.uiController.onCopyRoomIdClick(this.roomDataManager.getCurrentRoom());
  }

  onDestroy() {
    if (this.socketManager) {
      this.socketManager.disconnect();
    }
  }
}