const { ccclass, property } = cc._decorator;

@ccclass
export default class RoomJoinUI extends cc.Component {
  // Join Panel
  @property(cc.Node)
  joinPanel = null;

  @property(cc.EditBox)
  roomIdInput = null;

  @property(cc.EditBox)
  playerNameInput = null;

  @property(cc.Button)
  joinBtn = null;

  @property(cc.Button)
  createLobbyBtn = null;

  @property(cc.Label)
  statusLabel = null;

  // Lobby Panel
  @property(cc.Node)
  lobbyPanel = null;

  @property(cc.Label)
  roomInfoLabel = null;

  @property(cc.Label)
  playersCountLabel = null;

  @property(cc.Node)
  playersListNode = null;

  @property(cc.Prefab)
  playerItemPrefab = null;

  @property(cc.Button)
  startGameBtn = null;

  @property(cc.Button)
  leaveRoomBtn = null;

  // Socket connection
  socket = null;
  playerId = null;
  currentRoom = null;
  roomData = null;

  onLoad() {
    this.setupUI();
    this.connectToServer();
  }

  setupUI() {
    // Show join panel initially
    this.showJoinPanel();

    // Setup button events
    this.joinBtn.node.on("click", this.onJoinRoomClick, this);
    if (this.startGameBtn) {
      this.startGameBtn.node.on("click", this.onStartGameClick, this);
    }
    if (this.leaveRoomBtn) {
      this.leaveRoomBtn.node.on("click", this.onLeaveRoomClick, this);
    }

    // Set default values
    this.playerNameInput.string = `Player_${Math.floor(Math.random() * 1000)}`;
    this.roomIdInput.string = "test-room";

    this.updateStatus("Đang kết nối tới server...");
  }

  showJoinPanel() {
    if (this.joinPanel) this.joinPanel.active = true;
    if (this.lobbyPanel) this.lobbyPanel.active = false;
  }

  showLobbyPanel() {
    if (this.joinPanel) this.joinPanel.active = false;
    if (this.lobbyPanel) this.lobbyPanel.active = true;
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
      this.roomData = data.roomData;

      this.showLobbyPanel();
      this.updateRoomInfo();
      this.updateStatus("Đã vào phòng thành công");
    });

    // Player joined
    this.socket.on("player-joined", (data) => {
      console.log("👥 Player joined:", data);
      // Cập nhật danh sách players
      if (this.roomData && this.roomData.players) {
        this.updatePlayersList();
      }
    });

    // Player left
    this.socket.on("player-left", (data) => {
      console.log("👋 Player left:", data);
      // Remove player from local data
      if (this.roomData && this.roomData.players) {
        this.roomData.players = this.roomData.players.filter(
          (p) => p.id !== data.playerId
        );
        this.updatePlayersList();
      }
    });

    // Game started
    this.socket.on("game-started", () => {
      console.log("🚀 Game Started!");
      this.updateStatus("Game đã bắt đầu!");
      // Ẩn UI, chuyển sang game
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
      this.showJoinPanel();
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

  updateRoomInfo() {
    if (!this.roomData) return;

    // Update room info
    if (this.roomInfoLabel) {
      this.roomInfoLabel.string = `Phòng: ${this.currentRoom}`;
    }

    // Update players count
    if (this.playersCountLabel) {
      const playerCount = this.roomData.players
        ? this.roomData.players.length
        : 0;
      const maxPlayers = this.roomData.maxPlayers || 4;
      this.playersCountLabel.string = `${playerCount}/${maxPlayers} players in room`;
    }

    this.updatePlayersList();
  }

  updatePlayersList() {
    if (!this.playersListNode || !this.roomData || !this.roomData.players)
      return;

    // Clear existing players
    this.playersListNode.removeAllChildren();

    // Add each player
    this.roomData.players.forEach((player, index) => {
      let playerItem;

      if (this.playerItemPrefab) {
        playerItem = cc.instantiate(this.playerItemPrefab);
      } else {
        // Create simple text node if no prefab
        playerItem = new cc.Node();
        playerItem.addComponent(cc.Label);
      }

      const label = playerItem.getComponent(cc.Label);
      if (label) {
        label.string = `PlayerName: ${player.name}`;

        // Highlight current player
        if (player.id === this.playerId) {
          label.string += " (You)";
          label.node.color = cc.Color.YELLOW;
        }
      }

      this.playersListNode.addChild(playerItem);
    });
  }

  onStartGameClick() {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit("start-game", {
      roomId: this.currentRoom,
      playerId: this.playerId,
    });
  }

  onLeaveRoomClick() {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit("leave-room", {
      roomId: this.currentRoom,
      playerId: this.playerId,
    });

    this.currentRoom = null;
    this.roomData = null;
    this.showJoinPanel();
    this.updateStatus("Đã rời khỏi phòng");
  }

  onDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
