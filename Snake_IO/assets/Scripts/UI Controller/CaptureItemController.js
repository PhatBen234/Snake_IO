// CaptureItemController.js
cc.Class({
    extends: cc.Component,

    properties: {
        imageSprite: cc.Sprite,      // Sprite hiển thị ảnh
        infoLabel: cc.Label,         // Label hiển thị thông tin
        loadingSpinner: cc.Node,     // Loading indicator (optional)
        backgroundSprite: cc.Sprite, // Background cho item
    },

    onLoad() {
        // Initialize
        this.setupBackground();
        this.reset();
    },

    setupBackground() {
        // Setup background color hoặc sprite nếu cần
        if (this.backgroundSprite) {
            // Có thể set màu nền hoặc texture
            // this.backgroundSprite.node.color = cc.Color.GRAY;
        }
    },

    reset() {
        // Reset về trạng thái ban đầu
        if (this.imageSprite) {
            this.imageSprite.spriteFrame = null;
            this.imageSprite.node.active = false;
        }
        
        if (this.infoLabel) {
            this.infoLabel.string = "";
        }
        
        if (this.loadingSpinner) {
            this.loadingSpinner.active = false;
        }
    },

    setScreenshotData(screenshot) {
        // Set thông tin screenshot
        if (this.infoLabel && screenshot) {
            const playerNames = screenshot.players.map(p => p.name).join(", ");
            const gameIdShort = screenshot.gameId.substring(0, 8);
            const timestamp = new Date(screenshot.timestamp).toLocaleString();
            
            this.infoLabel.string = `Game ID: ${gameIdShort}...\nPlayers: ${playerNames}\nTime: ${timestamp}`;
        }
    },

    showLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.active = true;
        }
        
        if (this.imageSprite) {
            this.imageSprite.node.active = false;
        }
    },

    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.active = false;
        }
    },

    setImage(spriteFrame) {
        if (this.imageSprite && spriteFrame) {
            this.imageSprite.spriteFrame = spriteFrame;
            this.imageSprite.node.active = true;
            this.hideLoading();
        }
    },

    showError(errorMessage) {
        this.hideLoading();
        
        if (this.infoLabel) {
            this.infoLabel.string += `\n[Error: ${errorMessage}]`;
        }
    },

    // Method để scale image phù hợp với container
    scaleImageToContainer(maxWidth, maxHeight) {
        if (!this.imageSprite || !this.imageSprite.spriteFrame) return;
        
        const imageNode = this.imageSprite.node;
        const imageSize = imageNode.getContentSize();
        
        if (imageSize.width > 0 && imageSize.height > 0) {
            const scaleX = maxWidth / imageSize.width;
            const scaleY = maxHeight / imageSize.height;
            const scale = Math.min(scaleX, scaleY, 1);
            
            imageNode.setScale(scale);
        }
    }
});