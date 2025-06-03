const { ccclass, property } = cc._decorator;

@ccclass
export default class RoomJoinUI extends cc.Component {
  @property(cc.EditBox)
  roomIdInput = null;

  @property(cc.EditBox)
  playerNameInput = null;

  @property(cc.Button)
  joinBtn = null;

  @property(cc.Label)
  statusLabel = null;

  // Socket connection
  socket = null;
  playerId = null;
  currentRoom = null;

  onLoad() {
    this.setupUI();
    this.connectToServer();
  }

  setupUI() {
    // Setup button event
    this.joinBtn.node.on("click", this.onJoinRoomClick, this);

    // Set default values
    this.playerNameInput.string = `Player_${Math.floor(Math.random() * 1000)}`;
    this.roomIdInput.string = "test-room";

    this.updateStatus("Đang kết nối tới server...");
  }

  connectToServer() {
    this.socket = window.io("http://localhost:3000", {
      transports: ["websocket"],
    });

    this.setupSocketEvents();
  }

  setupSocketEvents() {
    // Kết nối thành công
    this.socket.on("connect", () => {
      this.playerId = this.socket.id;
      console.log("✅ Connected to server, id:", this.playerId);
      this.updateStatus("Đã kết nối server");
      this.joinBtn.interactable = true;
    });

    // Join room thành công
    this.socket.on("joined-room", (data) => {
      console.log("🎉 Joined room:", data);
      this.currentRoom = data.roomId;
      this.updateStatus(`Đã vào phòng: ${data.roomId}`);

      // Ẩn UI join, hiển thị game hoặc waiting
      this.node.active = false;
    });

    // Room full
    this.socket.on("room-full", () => {
      console.log("🚫 Room is full");
      this.updateStatus("Phòng đã đầy!");
    });

    // Disconnect
    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
      this.updateStatus("Mất kết nối server");
      this.joinBtn.interactable = false;
    });
  }

  onJoinRoomClick() {
    const roomId = this.roomIdInput.string.trim();
    const playerName = this.playerNameInput.string.trim();

    if (!roomId) {
      this.updateStatus("Vui lòng nhập ID phòng!");
      return;
    }

    if (!playerName) {
      this.updateStatus("Vui lòng nhập tên người chơi!");
      return;
    }

    this.joinRoom(roomId, playerName);
  }

  joinRoom(roomId, playerName) {
    if (!this.socket || !this.socket.connected) {
      this.updateStatus("Chưa kết nối tới server!");
      return;
    }

    this.updateStatus("Đang vào phòng...");
    this.joinBtn.interactable = false;

    console.log("📥 Attempting to join room:", roomId);

    this.socket.emit("join-room", {
      roomId: roomId,
      playerId: this.playerId,
      playerName: playerName,
    });

    // Enable button lại sau 2 giây để tránh spam
    setTimeout(() => {
      this.joinBtn.interactable = true;
    }, 2000);
  }

  updateStatus(message) {
    if (this.statusLabel) {
      this.statusLabel.string = message;
    }
    console.log("📢 Status:", message);
  }

  onDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
