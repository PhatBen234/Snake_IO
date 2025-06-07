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
    this.setupSceneEvents();
  }

  setupSceneEvents() {
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
    this.showLoadingScreen();
  }

  onAfterSceneLoad(sceneName) {
    this.hideLoadingScreen();
    this.handleSceneLoaded(sceneName);
  }

  handleSceneLoaded(sceneName) {
    const sceneHandlers = {
      GameScene: () => this.onGameSceneLoaded(),
      JoinRoom: () => this.onLobbySceneLoaded(),
      MenuScene: () => this.onMenuSceneLoaded(),
    };

    const handler = sceneHandlers[sceneName];
    if (handler) handler();
  }

  onGameSceneLoaded() {
    if (!this.hasRequiredGameData()) {
      this.loadLobbyScene();
    }
  }

  onLobbySceneLoaded() {
    this.cleanupGameData();
  }

  onMenuSceneLoaded() {
    this.fullCleanup();
  }

  showLoadingScreen() {
    if (this.loadingScreen) return;

    const scene = cc.director.getScene();
    const loadingNode = new cc.Node("LoadingScreen");
    loadingNode.parent = scene;

    // Background
    const bg = loadingNode.addComponent(cc.Sprite);
    loadingNode.color = new cc.Color(0, 0, 0, 180);
    loadingNode.width = cc.winSize.width;
    loadingNode.height = cc.winSize.height;

    // Loading text
    const textNode = new cc.Node("LoadingText");
    textNode.parent = loadingNode;
    const label = textNode.addComponent(cc.Label);
    label.string = "Đang tải...";
    label.fontSize = 24;
    label.node.color = cc.Color.WHITE;

    this.loadingScreen = loadingNode;
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.destroy();
      this.loadingScreen = null;
    }
  }

  // Public scene transition methods
  loadGameScene() {
    if (!this.hasRequiredGameData()) {
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
  }

  cleanupGameData() {
    // Keep socket connection active
    window.currentRoomId = null;
    window.roomData = null;
  }

  fullCleanup() {
    if (window.gameSocket && window.gameSocket.connected) {
      window.gameSocket.disconnect();
    }

    window.gameSocket = null;
    window.currentRoomId = null;
    window.currentPlayerId = null;
    window.roomData = null;
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

  hasRequiredGameData() {
    return window.gameSocket && window.currentRoomId;
  }

  // Game flow methods
  returnToLobbyFromGame() {
    this.emitLeaveGameEvent();
    this.loadLobbyScene();
  }

  quitToMenu() {
    if (this.isInGame()) {
      this.emitLeaveGameEvent();
    }
    this.emitLeaveRoomEvent();
    this.loadMenuScene();
  }

  emitLeaveGameEvent() {
    if (this.canEmitSocketEvent()) {
      window.gameSocket.emit("leave-game", {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
      });
    }
  }

  emitLeaveRoomEvent() {
    if (this.canEmitSocketEvent()) {
      window.gameSocket.emit("leave-room", {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
      });
    }
  }

  canEmitSocketEvent() {
    return (
      window.gameSocket &&
      window.gameSocket.connected &&
      window.currentRoomId &&
      window.currentPlayerId
    );
  }

  onDestroy() {
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
