const { ccclass } = cc._decorator;

@ccclass
export default class SceneManager extends cc.Component {
  static instance = null;

  onLoad() {
    // Singleton pattern
    if (SceneManager.instance) {
      this.node.destroy();
      return;
    }

    SceneManager.instance = this;
    cc.game.addPersistRootNode(this.node);

    console.log("🎬 SceneManager initialized");
    this.setupSceneEvents();
  }

  setupSceneEvents() {
    // Listen for scene loading events
    cc.director.on(
      cc.Director.EVENT_BEFORE_SCENE_LOADING,
      this.onBeforeSceneLoad,
      this
    );
    cc.director.on(
      cc.Director.EVENT_AFTER_SCENE_LAUNCH,
      this.onAfterSceneLoad,
      this
    );
  }

  onBeforeSceneLoad(sceneName) {
    console.log("🎬 Loading scene:", sceneName);
    this.showLoadingScreen();
  }

  onAfterSceneLoad(sceneName) {
    console.log("✅ Scene loaded:", sceneName);
    this.hideLoadingScreen();

    // Handle post-load setup
    this.handleSceneLoaded(sceneName);
  }

  handleSceneLoaded(sceneName) {
    switch (sceneName) {
      case "GameScene":
        this.onGameSceneLoaded();
        break;
      case "JoinRoom":
        this.onLobbySceneLoaded();
        break;
      case "MenuScene":
        this.onMenuSceneLoaded();
        break;
    }
  }

  onGameSceneLoaded() {
    console.log("🎮 Game scene loaded, checking game data...");

    // Verify required data exists
    if (!window.gameSocket || !window.currentRoomId) {
      console.error("❌ Missing game data, returning to lobby");
      this.loadLobbyScene();
      return;
    }

    console.log("✅ Game data verified, ready to play");
  }

  onLobbySceneLoaded() {
    console.log("🏠 Lobby scene loaded");

    // Clean up game data if returning from game
    this.cleanupGameData();
  }

  onMenuSceneLoaded() {
    console.log("📋 Menu scene loaded");

    // Complete cleanup when returning to menu
    this.fullCleanup();
  }

  showLoadingScreen() {
    // Create simple loading overlay
    const loadingNode = new cc.Node("LoadingScreen");
    loadingNode.parent = cc.director.getScene();

    // Add background
    const bg = loadingNode.addComponent(cc.Sprite);
    loadingNode.color = new cc.Color(0, 0, 0, 180);
    loadingNode.width = cc.winSize.width;
    loadingNode.height = cc.winSize.height;

    // Add loading text
    const textNode = new cc.Node("LoadingText");
    textNode.parent = loadingNode;
    const label = textNode.addComponent(cc.Label);
    label.string = "Đang tải...";
    label.fontSize = 24;
    label.node.color = cc.Color.WHITE;

    // Store reference for cleanup
    this.loadingScreen = loadingNode;
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.destroy();
      this.loadingScreen = null;
    }
  }

  // Public methods for scene transitions
  loadGameScene() {
    if (!window.gameSocket || !window.currentRoomId) {
      console.error("❌ Cannot load game scene: missing data");
      return false;
    }

    cc.director.loadScene("GameScene");
    return true;
  }

  loadLobbyScene() {
    cc.director.loadScene("JoinRoom");
  }

  loadMenuScene() {
    cc.director.loadScene("MenuScene");
  }

  // Data management
  saveGameData(socketManager, roomDataManager) {
    window.gameSocket = socketManager.socket;
    window.currentRoomId = roomDataManager.getCurrentRoom();
    window.currentPlayerId = socketManager.getPlayerId();
    window.roomData = roomDataManager.getRoomData();

    console.log("💾 Game data saved for scene transition");
  }

  cleanupGameData() {
    // Keep socket connection but clean other data
    if (window.gameSocket && window.gameSocket.connected) {
      console.log("🔄 Keeping socket connection active");
    }

    // Clear room-specific data
    window.currentRoomId = null;
    window.roomData = null;
  }

  fullCleanup() {
    // Complete cleanup including socket
    if (window.gameSocket) {
      window.gameSocket.disconnect();
      window.gameSocket = null;
    }

    window.currentRoomId = null;
    window.currentPlayerId = null;
    window.roomData = null;

    console.log("🧹 Full cleanup completed");
  }

  // Utility methods
  getCurrentScene() {
    return cc.director.getScene().name;
  }

  isInGame() {
    return this.getCurrentScene() === "GameScene";
  }

  isInLobby() {
    return this.getCurrentScene() === "JoinRoom";
  }

  // Game flow helpers
  returnToLobbyFromGame() {
    console.log("🔙 Returning to lobby from game");

    // Send leave game event if still connected
    if (
      window.gameSocket &&
      window.gameSocket.connected &&
      window.currentRoomId
    ) {
      window.gameSocket.emit("leave-game", {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
      });
    }

    this.loadLobbyScene();
  }

  quitToMenu() {
    console.log("🚪 Quitting to menu");

    // Send appropriate leave events
    if (
      window.gameSocket &&
      window.gameSocket.connected &&
      window.currentRoomId
    ) {
      if (this.isInGame()) {
        window.gameSocket.emit("leave-game", {
          roomId: window.currentRoomId,
          playerId: window.currentPlayerId,
        });
      }

      window.gameSocket.emit("leave-room", {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
      });
    }

    this.loadMenuScene();
  }

  onDestroy() {
    // Clean up event listeners
    cc.director.off(
      cc.Director.EVENT_BEFORE_SCENE_LOADING,
      this.onBeforeSceneLoad,
      this
    );
    cc.director.off(
      cc.Director.EVENT_AFTER_SCENE_LAUNCH,
      this.onAfterSceneLoad,
      this
    );

    if (this.loadingScreen) {
      this.loadingScreen.destroy();
    }
  }

  // Static helper methods
  static getInstance() {
    return SceneManager.instance;
  }

  static loadGame() {
    const instance = SceneManager.getInstance();
    return instance ? instance.loadGameScene() : false;
  }

  static loadLobby() {
    const instance = SceneManager.getInstance();
    if (instance) instance.loadLobbyScene();
  }

  static loadMenu() {
    const instance = SceneManager.getInstance();
    if (instance) instance.loadMenuScene();
  }

  static returnToLobby() {
    const instance = SceneManager.getInstance();
    if (instance) instance.returnToLobbyFromGame();
  }

  static quitToMenu() {
    const instance = SceneManager.getInstance();
    if (instance) instance.quitToMenu();
  }
}
