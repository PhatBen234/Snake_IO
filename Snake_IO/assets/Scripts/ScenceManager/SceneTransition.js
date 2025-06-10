import DataManager from "./DataManager";

export default class SceneTransition {
  constructor() {
    this.dataManager = new DataManager();
  }

  loadGameScene() {
    if (!this.dataManager.hasRequiredGameData()) {
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
}
