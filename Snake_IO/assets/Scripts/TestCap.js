cc.Class({
  extends: cc.Component,

  properties: {
    listNode: cc.Node, 
    imageSprite: cc.Sprite, 
    statusLabel: cc.Label, 
    loadBtn: cc.Button, 

    serverUrl: {
      default: "http://localhost:3000",
      displayName: "Server URL",
    },
  },

  onLoad() {
    this.loadBtn.node.on("click", this.loadScreenshots, this);
    this.statusLabel.string = "Click Load to get screenshots";

    this.imageSprite.node.active = false;
  },

  async loadScreenshots() {
    try {
      this.statusLabel.string = "Loading...";
      this.clearList();

      const response = await this.httpGet(
        `${this.serverUrl}/api/screenshot/list/recent`
      );
      const data = JSON.parse(response);

      console.log("API Response:", data); 

      if (data.success && data.data.length > 0) {
        this.statusLabel.string = `Found ${data.data.length} screenshots`;
        this.createList(data.data);
      } else {
        this.statusLabel.string = "No screenshots found";
      }
    } catch (error) {
      console.error("Load error:", error);
      this.statusLabel.string = "Error: " + error.message;
    }
  },

  createList(screenshots) {
    screenshots.forEach((screenshot, index) => {
      const btnNode = new cc.Node(`Screenshot_${index}`);
      const btn = btnNode.addComponent(cc.Button);
      const label = btnNode.addComponent(cc.Label);

      btnNode.setParent(this.listNode);
      btnNode.setPosition(0, -index * 50); 
      btnNode.setContentSize(400, 45);

      const playerNames = screenshot.players.map((p) => p.name).join(", ");
      const displayText = `${screenshot.gameId.substring(
        0,
        20
      )}... - Players: ${playerNames}`;

      label.string = displayText;
      label.fontSize = 12;
      label.lineHeight = 16;

      btnNode.on("click", () => {
        console.log("Loading image for gameId:", screenshot.gameId); 
        this.loadImage(screenshot.gameId);
      });

      const bg = btnNode.addComponent(cc.Sprite);
    });

    this.listNode.setContentSize(400, screenshots.length * 50);
  },

  clearList() {
    this.listNode.removeAllChildren();
    this.imageSprite.node.active = false;
  },

  async loadImage(gameId) {
    try {
      this.statusLabel.string = `Loading image: ${gameId}`;

      const imageUrl = `${this.serverUrl}/api/screenshot/${gameId}`;

      console.log("Loading image from URL:", imageUrl);

      cc.loader.load(
        {
          url: imageUrl,
          type: "png",
        },
        (err, texture) => {
          if (err) {
            console.error("Load image error:", err);
            this.statusLabel.string = `Failed to load image: ${err.message}`;
            return;
          }

          const spriteFrame = new cc.SpriteFrame(texture);
          this.imageSprite.spriteFrame = spriteFrame;
          this.imageSprite.node.active = true;

          this.scaleImageToFit();

          this.statusLabel.string = `Image loaded: ${gameId}`;
          console.log("Image loaded successfully"); 
        }
      );
    } catch (error) {
      console.error("Load image error:", error);
      this.statusLabel.string = "Error loading image: " + error.message;
    }
  },

  scaleImageToFit() {
    const imageNode = this.imageSprite.node;
    const maxWidth = 500; 
    const maxHeight = 400;

    const imageSize = imageNode.getContentSize();

    if (imageSize.width > 0 && imageSize.height > 0) {
      const scaleX = maxWidth / imageSize.width;
      const scaleY = maxHeight / imageSize.height;
      const scale = Math.min(scaleX, scaleY, 1); 
      imageNode.setScale(scale);
      console.log(
        `Image scaled: ${scale}, original size: ${imageSize.width}x${imageSize.height}`
      );
    }
  },

  httpGet(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.timeout = 10000; 

      xhr.open("GET", url, true);

      xhr.setRequestHeader("Accept", "application/json");

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        }
      };

      xhr.ontimeout = () => reject(new Error("Request timeout"));
      xhr.onerror = () => reject(new Error("Network error"));

      xhr.send();
    });
  },
});
