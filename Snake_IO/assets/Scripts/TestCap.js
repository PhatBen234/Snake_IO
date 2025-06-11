// SimpleScreenshotTest.js
cc.Class({
  extends: cc.Component,

  properties: {
    // UI References
    listNode: cc.Node, // Node chứa danh sách
    imageSprite: cc.Sprite, // Sprite hiển thị ảnh
    statusLabel: cc.Label, // Label hiển thị trạng thái
    loadBtn: cc.Button, // Button load danh sách

    serverUrl: {
      default: "http://localhost:3000",
      displayName: "Server URL",
    },
  },

  onLoad() {
    // Setup button
    this.loadBtn.node.on("click", this.loadScreenshots, this);
    this.statusLabel.string = "Click Load to get screenshots";

    // Hide image initially
    this.imageSprite.node.active = false;
  },

  async loadScreenshots() {
    try {
      this.statusLabel.string = "Loading...";
      this.clearList();

      // Get screenshots list
      const response = await this.httpGet(
        `${this.serverUrl}/api/screenshot/list/recent`
      );
      const data = JSON.parse(response);

      console.log("API Response:", data); // Debug log

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
      // Create simple button for each screenshot
      const btnNode = new cc.Node(`Screenshot_${index}`);
      const btn = btnNode.addComponent(cc.Button);
      const label = btnNode.addComponent(cc.Label);

      // Setup button
      btnNode.setParent(this.listNode);
      btnNode.setPosition(0, -index * 50); // Tăng khoảng cách
      btnNode.setContentSize(400, 45); // Tăng size để hiển thị đủ text

      // Tạo display text từ players array
      const playerNames = screenshot.players.map((p) => p.name).join(", ");
      const displayText = `${screenshot.gameId.substring(
        0,
        20
      )}... - Players: ${playerNames}`;

      // Setup label
      label.string = displayText;
      label.fontSize = 12;
      label.lineHeight = 16;

      // Setup button click
      btnNode.on("click", () => {
        console.log("Loading image for gameId:", screenshot.gameId); // Debug log
        this.loadImage(screenshot.gameId);
      });

      // Add simple background color
      const bg = btnNode.addComponent(cc.Sprite);
      // Có thể set màu nền đơn giản hoặc để mặc định
    });

    // Adjust list node size
    this.listNode.setContentSize(400, screenshots.length * 50);
  },

  clearList() {
    this.listNode.removeAllChildren();
    this.imageSprite.node.active = false;
  },

  async loadImage(gameId) {
    try {
      this.statusLabel.string = `Loading image: ${gameId}`;

      // Sử dụng đúng endpoint từ API response
      const imageUrl = `${this.serverUrl}/api/screenshot/${gameId}`;

      console.log("Loading image from URL:", imageUrl); // Debug log

      // Load image using Cocos loader
      cc.loader.load(
        {
          url: imageUrl,
          type: "png", // Hoặc có thể để "img" cho tự động detect
        },
        (err, texture) => {
          if (err) {
            console.error("Load image error:", err);
            this.statusLabel.string = `Failed to load image: ${err.message}`;
            return;
          }

          // Create sprite frame and display
          const spriteFrame = new cc.SpriteFrame(texture);
          this.imageSprite.spriteFrame = spriteFrame;
          this.imageSprite.node.active = true;

          // Scale image to fit
          this.scaleImageToFit();

          this.statusLabel.string = `Image loaded: ${gameId}`;
          console.log("Image loaded successfully"); // Debug log
        }
      );
    } catch (error) {
      console.error("Load image error:", error);
      this.statusLabel.string = "Error loading image: " + error.message;
    }
  },

  scaleImageToFit() {
    const imageNode = this.imageSprite.node;
    const maxWidth = 500; // Tăng size để test rõ hơn
    const maxHeight = 400;

    const imageSize = imageNode.getContentSize();

    if (imageSize.width > 0 && imageSize.height > 0) {
      const scaleX = maxWidth / imageSize.width;
      const scaleY = maxHeight / imageSize.height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

      imageNode.setScale(scale);
      console.log(
        `Image scaled: ${scale}, original size: ${imageSize.width}x${imageSize.height}`
      );
    }
  },

  // Simple HTTP GET with better error handling
  httpGet(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Add timeout
      xhr.timeout = 10000; // 10 seconds

      xhr.open("GET", url, true);

      // Set headers if needed for CORS
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
