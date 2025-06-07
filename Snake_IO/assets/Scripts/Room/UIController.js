const { ccclass, property } = cc._decorator;

@ccclass
export default class UIController extends cc.Component {
  // Join Panel
  @property(cc.Node) joinPanel = null;
  @property(cc.EditBox) roomIdInput = null;
  @property(cc.EditBox) playerNameInput = null;
  @property(cc.Button) joinBtn = null;
  @property(cc.Button) createLobbyBtn = null;
  @property(cc.Label) statusLabel = null;

  // Lobby Panel
  @property(cc.Node) lobbyPanel = null;
  @property(cc.Label) roomInfoLabel = null;
  @property(cc.Label) roomIdCopyLabel = null;
  @property(cc.Button) copyRoomIdBtn = null;
  @property(cc.Label) playersCountLabel = null;
  @property(cc.Node) playersListNode = null;
  @property(cc.Prefab) playerItemPrefab = null;
  @property(cc.Button) startGameBtn = null;
  @property(cc.Button) leaveRoomBtn = null;

  callbacks = {};
  currentRoomId = "";

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
    if (this.copyRoomIdBtn) {
      this.copyRoomIdBtn.node.on("click", this.onCopyRoomIdClick, this);
    }
  }

  setDefaultValues() {
    this.playerNameInput.string = `Player_${Math.floor(Math.random() * 1000)}`;
    this.roomIdInput.string = "";
  }

  showJoinPanel() {
    this.togglePanels(true, false);
  }

  showLobbyPanel() {
    this.togglePanels(false, true);
  }

  togglePanels(showJoin, showLobby) {
    if (this.joinPanel) this.joinPanel.active = showJoin;
    if (this.lobbyPanel) this.lobbyPanel.active = showLobby;
  }

  updateStatus(message) {
    if (this.statusLabel) {
      this.statusLabel.string = message;
    }
  }

  updateRoomInfo(roomId, roomData, isHost, playerId) {
    if (!roomData) return;

    this.currentRoomId = roomId;

    if (this.roomInfoLabel) {
      this.roomInfoLabel.string = `Phòng: ${roomId}`;
    }

    if (this.roomIdCopyLabel) {
      this.roomIdCopyLabel.string = `Room ID: ${roomId}`;
    }

    this.updatePlayersCount(roomData);
    this.updateStartGameButton(isHost, roomData);
    this.updatePlayersList(roomData, playerId);

    if (this.copyRoomIdBtn) {
      this.copyRoomIdBtn.node.active = !!roomId;
    }
  }

  updatePlayersCount(roomData) {
    if (this.playersCountLabel) {
      const playerCount = roomData.players?.length || 0;
      const maxPlayers = roomData.maxPlayers || 4;
      this.playersCountLabel.string = `${playerCount}/${maxPlayers} players in room`;
    }
  }

  updateStartGameButton(isHost, roomData) {
    if (!this.startGameBtn) return;

    this.startGameBtn.node.active = isHost;

    if (isHost && roomData) {
      const playerCount = roomData.players?.length || 0;
      const canStart = playerCount >= 2;

      this.startGameBtn.interactable = canStart;
      this.startGameBtn.node.color = canStart ? cc.Color.WHITE : cc.Color.GRAY;
    }
  }

  updatePlayersList(roomData, playerId) {
    if (!this.playersListNode || !roomData?.players) return;

    this.playersListNode.removeAllChildren();

    roomData.players.forEach((player) => {
      const playerItem = this.createPlayerItem();
      const label = playerItem.getComponent(cc.Label);

      if (label) {
        label.string = this.getPlayerDisplayName(player, playerId);
        if (player.id === playerId) {
          label.node.color = cc.Color.YELLOW;
        }
      }

      this.playersListNode.addChild(playerItem);
    });
  }

  createPlayerItem() {
    if (this.playerItemPrefab) {
      return cc.instantiate(this.playerItemPrefab);
    }

    const playerItem = new cc.Node();
    playerItem.addComponent(cc.Label);
    return playerItem;
  }

  getPlayerDisplayName(player, playerId) {
    let name = player.name;
    if (player.isHost) name += " 👑";
    if (player.id === playerId) name += " (You)";
    return name;
  }

  setButtonsEnabled(enabled) {
    this.joinBtn.interactable = enabled;
    this.createLobbyBtn.interactable = enabled;
  }

  hideUI() {
    this.node.active = false;
  }

  showUI() {
    this.node.active = true;
  }

  onJoinRoomClick() {
    const roomId = this.roomIdInput.string.trim();
    const playerName = this.playerNameInput.string.trim();

    if (!this.validateInput(roomId, playerName, true)) return;

    this.triggerCallback("joinRoom", { roomId, playerName });
  }

  onCreateRoomClick() {
    const playerName = this.playerNameInput.string.trim();

    if (!this.validateInput("", playerName, false)) return;

    this.triggerCallback("createRoom", { playerName });
  }

  validateInput(roomId, playerName, needRoomId) {
    if (needRoomId && !roomId) {
      this.updateStatus("Vui lòng nhập ID phòng!");
      return false;
    }

    if (!playerName) {
      this.updateStatus("Vui lòng nhập tên người chơi!");
      return false;
    }

    return true;
  }

  onStartGameClick() {
    this.triggerCallback("startGame");
  }

  onLeaveRoomClick() {
    this.triggerCallback("leaveRoom");
  }

  onCopyRoomIdClick() {
    if (!this.currentRoomId) {
      this.updateStatus("Không có Room ID để copy!");
      return;
    }

    this.copyToClipboard(this.currentRoomId);
  }

  copyToClipboard(text) {
    if (navigator?.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => this.updateStatus(`✅ Đã copy Room ID: ${text}`))
        .catch(() => this.fallbackCopy(text));
    } else {
      this.fallbackCopy(text);
    }
  }

  fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.cssText = "position:fixed;left:-9999px;top:-9999px;";

    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      this.updateStatus(`✅ Đã copy Room ID: ${text}`);
    } catch (err) {
      this.updateStatus(`Room ID: ${text} (Không thể copy tự động)`);
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
    this.callbacks[event]?.forEach((callback) => callback(data));
  }
}
