const { ccclass, property } = cc._decorator;

@ccclass
export default class UIController extends cc.Component {
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
  roomIdCopyLabel = null;

  @property(cc.Button)
  copyRoomIdBtn = null; // Thêm nút copy

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

  callbacks = {};
  currentRoomId = ""; // Lưu room ID hiện tại

  onLoad() {
    this.setupUI();
  }

  setupUI() {
    this.showJoinPanel();
    this.setupButtonEvents();
    this.setDefaultValues();
    this.updateStatus("Đang kết nối tới server...");
  }

  setupButtonEvents() {
    this.joinBtn.node.on("click", this.onJoinRoomClick, this);
    this.createLobbyBtn.node.on("click", this.onCreateRoomClick, this);

    if (this.startGameBtn) {
      this.startGameBtn.node.on("click", this.onStartGameClick, this);
    }
    if (this.leaveRoomBtn) {
      this.leaveRoomBtn.node.on("click", this.onLeaveRoomClick, this);
    }

    // Thêm event cho nút copy
    if (this.copyRoomIdBtn) {
      this.copyRoomIdBtn.node.on("click", this.onCopyRoomIdClick, this);
    }
  }

  setDefaultValues() {
    this.playerNameInput.string = `Player_${Math.floor(Math.random() * 1000)}`;
    this.roomIdInput.string = "";
  }

  showJoinPanel() {
    if (this.joinPanel) this.joinPanel.active = true;
    if (this.lobbyPanel) this.lobbyPanel.active = false;
  }

  showLobbyPanel() {
    if (this.joinPanel) this.joinPanel.active = false;
    if (this.lobbyPanel) this.lobbyPanel.active = true;
  }

  updateStatus(message) {
    if (this.statusLabel) {
      this.statusLabel.string = message;
    }
    console.log("📢 Status:", message);
  }

  updateRoomInfo(roomId, roomData, isHost, playerId) {
    if (!roomData) return;

    // Lưu room ID để dùng cho copy
    this.currentRoomId = roomId;

    if (this.roomInfoLabel) {
      this.roomInfoLabel.string = `Phòng: ${roomId}`;
    }

    if (this.roomIdCopyLabel) {
      this.roomIdCopyLabel.string = `Room ID: ${roomId}`;
    }

    if (this.playersCountLabel) {
      const playerCount = roomData.players ? roomData.players.length : 0;
      const maxPlayers = roomData.maxPlayers || 4;
      this.playersCountLabel.string = `${playerCount}/${maxPlayers} players in room`;
    }

    this.updateStartGameButton(isHost, roomData);
    this.updatePlayersList(roomData, playerId);

    // Hiển thị nút copy khi có room ID
    if (this.copyRoomIdBtn) {
      this.copyRoomIdBtn.node.active = !!roomId;
    }
  }

  updateStartGameButton(isHost, roomData) {
    if (!this.startGameBtn) return;

    this.startGameBtn.node.active = isHost;

    if (isHost && roomData) {
      const playerCount = roomData.players ? roomData.players.length : 0;
      const minPlayers = 2;

      this.startGameBtn.interactable = playerCount >= minPlayers;

      if (playerCount >= minPlayers) {
        this.startGameBtn.node.color = cc.Color.WHITE;
      } else {
        this.startGameBtn.node.color = cc.Color.GRAY;
      }
    }
  }

  updatePlayersList(roomData, playerId) {
    if (!this.playersListNode || !roomData || !roomData.players) return;

    this.playersListNode.removeAllChildren();

    roomData.players.forEach((player, index) => {
      let playerItem;

      if (this.playerItemPrefab) {
        playerItem = cc.instantiate(this.playerItemPrefab);
      } else {
        playerItem = new cc.Node();
        playerItem.addComponent(cc.Label);
      }

      const label = playerItem.getComponent(cc.Label);
      if (label) {
        let playerText = `${player.name}`;

        if (player.isHost) {
          playerText += " 👑";
        }

        if (player.id === playerId) {
          playerText += " (You)";
          label.node.color = cc.Color.YELLOW;
        }

        label.string = playerText;
      }

      this.playersListNode.addChild(playerItem);
    });
  }

  setButtonInteractable(buttonName, interactable) {
    switch (buttonName) {
      case "join":
        this.joinBtn.interactable = interactable;
        break;
      case "create":
        this.createLobbyBtn.interactable = interactable;
        break;
    }
  }

  hideUI() {
    this.node.active = false;
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

    this.triggerCallback("joinRoom", { roomId, playerName });
  }

  onCreateRoomClick() {
    const playerName = this.playerNameInput.string.trim();

    if (!playerName) {
      this.updateStatus("Vui lòng nhập tên người chơi!");
      return;
    }

    this.triggerCallback("createRoom", { playerName });
  }

  onStartGameClick() {
    this.triggerCallback("startGame");
  }

  onLeaveRoomClick() {
    this.triggerCallback("leaveRoom");
  }

  onCopyRoomIdClick() {
    const roomId = this.currentRoomId;

    if (!roomId) {
      this.updateStatus("Không có Room ID để copy!");
      return;
    }

    // Thử copy bằng clipboard API
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(roomId)
        .then(() => {
          this.updateStatus(`✅ Đã copy Room ID: ${roomId}`);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
          this.fallbackCopy(roomId);
        });
    } else {
      // Fallback cho các trường hợp không support clipboard API
      this.fallbackCopy(roomId);
    }
  }

  fallbackCopy(roomId) {
    // Tạo một textarea ẩn để copy
    const textArea = document.createElement("textarea");
    textArea.value = roomId;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      this.updateStatus(`✅ Đã copy Room ID: ${roomId}`);
    } catch (err) {
      console.error("Fallback copy failed: ", err);
      this.updateStatus(`Room ID: ${roomId} (Không thể copy tự động)`);
    }

    document.body.removeChild(textArea);
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  triggerCallback(event, data = null) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => callback(data));
    }
  }
}
