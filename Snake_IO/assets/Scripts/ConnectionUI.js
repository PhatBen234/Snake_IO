const { ccclass, property } = cc._decorator;

@ccclass
export default class ConnectionUI extends cc.Component {
  // UI Elements
  @property(cc.Label)
  statusLabel = null;

  @property(cc.Label)
  playerIdLabel = null;

  @property(cc.Button)
  connectBtn = null;

  @property(cc.Button)
  disconnectBtn = null;

  @property(cc.Button)
  joinRoomBtn = null;

  @property(cc.EditBox)
  roomIdInput = null;

  @property(cc.EditBox)
  playerNameInput = null;

  @property(cc.EditBox)
  serverUrlInput = null;

  // Internal state
  testClient = null;
  isConnected = false;

  onLoad() {
    console.log("🔗 Connection UI loaded");
    this.setupEventHandlers();
    this.initializeInputs();
  }

  setupEventHandlers() {
    if (this.connectBtn) {
      this.connectBtn.node.on("click", this.onConnectClick, this);
    }

    if (this.disconnectBtn) {
      this.disconnectBtn.node.on("click", this.onDisconnectClick, this);
    }

    if (this.joinRoomBtn) {
      this.joinRoomBtn.node.on("click", this.onJoinRoomClick, this);
    }
  }

  initializeInputs() {
    if (this.serverUrlInput) {
      this.serverUrlInput.string = "http://localhost:3000";
    }

    if (this.roomIdInput) {
      this.roomIdInput.string = "test-room";
    }

    if (this.playerNameInput) {
      this.playerNameInput.string = "TestPlayer";
    }

    this.updateConnectionStatus("Disconnected", cc.Color.RED);
    this.updatePlayerIdLabel("Not connected");
    this.updateButtonStates();
  }
// *Quân: Hàm này chưa được gọi ở đâu cả
  // setTestClient(testClient) {
  //   this.testClient = testClient;
  //   console.log("🔗 Test client set:", !!testClient);
  // }

  // updateUI() {
  //   if (!this.testClient) return;

  //   // Update connection status
  //   const connected = this.testClient.socket?.connected || false;

  //   if (connected !== this.isConnected) {
  //     this.isConnected = connected;
  //     this.updateConnectionStatus(
  //       connected ? "Connected" : "Disconnected",
  //       connected ? cc.Color.GREEN : cc.Color.RED
  //     );

  //     this.updatePlayerIdLabel(
  //       connected
  //         ? this.testClient.playerId?.substring(0, 12) || "Unknown"
  //         : "Not connected"
  //     );

  //     this.updateButtonStates();
  //   }
  // }

  updateConnectionStatus(status, color) {
    if (this.statusLabel) {
      this.statusLabel.string = `Status: ${status}`;
      this.statusLabel.node.color = color;
    }
  }

  updatePlayerIdLabel(playerId) {
    if (this.playerIdLabel) {
      this.playerIdLabel.string = `ID: ${playerId}`;
    }
  }

  updateButtonStates() {
    if (this.connectBtn) {
      this.connectBtn.interactable = !this.isConnected;
    }

    if (this.disconnectBtn) {
      this.disconnectBtn.interactable = this.isConnected;
    }

    if (this.joinRoomBtn) {
      this.joinRoomBtn.interactable = this.isConnected;
    }
  }

  // Event handlers
  onConnectClick() {
    if (!this.testClient) {
      console.warn("⚠️ Test client not available");
      return;
    }

    if (this.isConnected) {
      console.log("ℹ️ Already connected");
      return;
    }

    console.log("🔌 Connecting to server...");

    // Update server URL if changed
    const serverUrl = this.serverUrlInput?.string || "http://localhost:3000";

    // Start the test client with custom URL
    this.testClient.connect(serverUrl);
  }

  onDisconnectClick() {
    if (!this.testClient || !this.isConnected) {
      console.log("ℹ️ Not connected");
      return;
    }

    console.log("🔌 Disconnecting from server...");
    this.testClient.disconnect();
  }

  onJoinRoomClick() {
    if (!this.testClient || !this.isConnected) {
      console.warn("⚠️ Not connected to server");
      return;
    }

    const roomId = this.roomIdInput?.string || "test-room";
    const playerName = this.playerNameInput?.string || "TestPlayer";

    console.log(`📥 Joining room: ${roomId} as ${playerName}`);
    this.testClient.joinRoom(roomId, playerName);
  }

  // Public methods
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      playerId: this.testClient?.playerId,
      serverUrl: this.serverUrlInput?.string,
      roomId: this.roomIdInput?.string,
      playerName: this.playerNameInput?.string,
    };
  }

  setServerUrl(url) {
    if (this.serverUrlInput) {
      this.serverUrlInput.string = url;
    }
  }

  setRoomId(roomId) {
    if (this.roomIdInput) {
      this.roomIdInput.string = roomId;
    }
  }

  setPlayerName(name) {
    if (this.playerNameInput) {
      this.playerNameInput.string = name;
    }
  }
}
