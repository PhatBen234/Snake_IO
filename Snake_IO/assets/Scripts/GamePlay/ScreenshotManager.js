import { GameConfig } from "./GameConfig";

export default class ScreenshotManager {
  constructor() {
    this.screenshotCamera = null;
    this.getCurrentRoomCallback = null;
  }

  initialize(config) {
    this.screenshotCamera = config.screenshotCamera;
    this.getCurrentRoomCallback = config.currentRoom;
  }

  async captureLeaderboard(scoreTablePopup, playersData) {
    try {
      if (!this.screenshotCamera) {
        console.warn("Screenshot camera not assigned");
        return null;
      }

      const width = GameConfig.SCREENSHOT_WIDTH;
      const height = GameConfig.SCREENSHOT_HEIGHT;

      const renderTexture = new cc.RenderTexture();
      const gl = cc.game._renderContext;

      renderTexture.initWithSize(width, height, gl.STENCIL_INDEX8);

      this.screenshotCamera.targetTexture = renderTexture;
      this.screenshotCamera.render(scoreTablePopup);

      const data = renderTexture.readPixels();
      if (data) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        const imageData = ctx.createImageData(width, height);

        for (let i = 0; i < data.length; i += 4) {
          imageData.data[i] = data[i];
          imageData.data[i + 1] = data[i + 1];
          imageData.data[i + 2] = data[i + 2];
          imageData.data[i + 3] = data[i + 3];
        }

        ctx.putImageData(imageData, 0, 0);

        // Create second canvas to flip the image
        const flippedCanvas = document.createElement("canvas");
        flippedCanvas.width = width;
        flippedCanvas.height = height;
        const flippedCtx = flippedCanvas.getContext("2d");

        // Flip and draw
        flippedCtx.save();
        flippedCtx.scale(1, -1);
        flippedCtx.translate(0, -height);
        flippedCtx.drawImage(canvas, 0, 0);
        flippedCtx.restore();

        const base64Image = flippedCanvas.toDataURL(
          "image/jpeg",
          GameConfig.SCREENSHOT_QUALITY
        );

        this.screenshotCamera.targetTexture = null;
        renderTexture.destroy();

        return base64Image;
      }

      this.screenshotCamera.targetTexture = null;
      renderTexture.destroy();
      return null;
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      return null;
    }
  }

  async uploadScreenshot(base64Image, playersData) {
    try {
      // Compress image before sending
      const compressedImage = await this.compressBase64Image(
        base64Image,
        GameConfig.SCREENSHOT_WIDTH,
        GameConfig.SCREENSHOT_HEIGHT,
        GameConfig.SCREENSHOT_COMPRESSION_QUALITY
      );

      const gameId = `game_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const payload = {
        gameId: gameId,
        screenshot: compressedImage,
        players: playersData.map((player) => ({
          id: player.id,
          name: player.name || `Player_${player.id?.substring(0, 4)}`,
          score: player.score,
        })),
        timestamp: new Date().toISOString(),
        roomId: this.getCurrentRoomCallback
          ? this.getCurrentRoomCallback()
          : null,
      };

      // Check payload size
      const payloadSize = JSON.stringify(payload).length;
      console.log(`Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

      if (payloadSize > GameConfig.SCREENSHOT_MAX_SIZE) {
        console.warn("Payload too large, compressing further...");
        const furtherCompressed = await this.compressBase64Image(
          base64Image,
          200,
          150,
          GameConfig.SCREENSHOT_FURTHER_COMPRESSION_QUALITY
        );
        payload.screenshot = furtherCompressed;
      }

      const response = await fetch(
        `${GameConfig.API_BASE_URL}${GameConfig.SCREENSHOT_UPLOAD_ENDPOINT}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (result.success) {
        console.log("Screenshot uploaded successfully:", result.filename);
        return result;
      } else {
        console.error("Upload failed:", result.message);
        return null;
      }
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  }

  compressBase64Image(
    base64String,
    maxWidth = GameConfig.SCREENSHOT_WIDTH,
    maxHeight = GameConfig.SCREENSHOT_HEIGHT,
    quality = GameConfig.SCREENSHOT_QUALITY
  ) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Export with lower quality
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.src = base64String;
    });
  }
}
