const fs = require("fs").promises;
const path = require("path");
const { getDB } = require("../db/firebaseService");

class ScreenshotService {
  constructor() {
    this.db = null;
    this.collection = "game_screenshots";
    this.resourcesPath = path.join(__dirname, "../resources");
    this.initResourcesFolder();
  }

  getDatabase() {
    if (!this.db) {
      this.db = getDB();
    }
    return this.db;
  }

  async initResourcesFolder() {
    try {
      await fs.access(this.resourcesPath);
    } catch (error) {
      await fs.mkdir(this.resourcesPath, { recursive: true });
      console.log("📁 Resources folder created:", this.resourcesPath);
    }
  }

  async saveScreenshot(data) {
    try {
      const { gameId, screenshot, players, timestamp, roomId } = data;

      const base64Size = screenshot.length * 0.75; 
      console.log(`Image size: ${(base64Size / 1024 / 1024).toFixed(2)} MB`);

      if (base64Size > 5 * 1024 * 1024) {
        // 5MB
        throw new Error("Image size too large after compression");
      }

      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
      const filename = `screenshot_${gameId}.png`;
      const filepath = path.join(this.resourcesPath, filename);

      await fs.writeFile(filepath, base64Data, "base64");

      const db = this.getDatabase();
      const docRef = db.collection(this.collection).doc(gameId);

      await docRef.set({
        gameId: gameId,
        filename: filename,
        filepath: filepath,
        players: players,
        timestamp: new Date(timestamp),
        roomId: roomId || null,
        createdAt: new Date(),
        fileSize: base64Size, 
      });

      console.log(`✅ Screenshot saved: ${filename}`);

      return {
        filename: filename,
        path: filepath,
        gameId: gameId,
      };
    } catch (error) {
      console.error("Save screenshot error:", error);
      throw error;
    }
  }

  async getScreenshot(gameId) {
    try {
      const db = this.getDatabase();
      const doc = await db.collection(this.collection).doc(gameId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();

      try {
        const filepath = data.filepath;
        const fileData = await fs.readFile(filepath);
        const base64Data = `data:image/png;base64,${fileData.toString(
          "base64"
        )}`;

        return {
          ...data,
          screenshot: base64Data,
        };
      } catch (fileError) {
        console.warn(`File not found: ${data.filepath}`);
        return data; 
      }
    } catch (error) {
      throw error;
    }
  }

  async getRecentScreenshots(limit = 10) {
    try {
      const db = this.getDatabase();
      const snapshot = await db
        .collection(this.collection)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      const screenshots = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        screenshots.push({
          gameId: data.gameId,
          filename: data.filename,
          players: data.players,
          timestamp: data.timestamp,
          roomId: data.roomId,
          thumbnailPath: `/api/screenshot/${data.gameId}`,
        });
      });

      return screenshots;
    } catch (error) {
      throw error;
    }
  }

  async cleanupOldScreenshots(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const db = this.getDatabase();
      const snapshot = await db
        .collection(this.collection)
        .where("timestamp", "<", cutoffDate)
        .get();

      const deletePromises = [];
      const fileDeletePromises = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        deletePromises.push(doc.ref.delete());

        fileDeletePromises.push(
          fs
            .unlink(data.filepath)
            .catch((err) =>
              console.warn(`Failed to delete file: ${data.filepath}`, err)
            )
        );
      });

      await Promise.all([...deletePromises, ...fileDeletePromises]);

      console.log(`🧹 Cleaned up ${snapshot.size} old screenshots`);
      return snapshot.size;
    } catch (error) {
      console.error("Cleanup error:", error);
      throw error;
    }
  }
}

module.exports = new ScreenshotService();