export default class LoadingScreen {
  constructor() {
    this.loadingScreen = null;
  }

  show() {
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

  hide() {
    if (this.loadingScreen) {
      this.loadingScreen.destroy();
      this.loadingScreen = null;
    }
  }

  destroy() {
    this.hide();
  }
}
