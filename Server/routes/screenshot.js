const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs").promises;
const ScreenshotService = require("../services/ScreenshotService");

router.post("/upload", async (req, res) => {
  try {
    const { gameId, screenshot, players, timestamp, roomId } = req.body;

    if (!gameId || !screenshot || !players) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: gameId, screenshot, players",
      });
    }

    const result = await ScreenshotService.saveScreenshot({
      gameId,
      screenshot,
      players,
      timestamp: timestamp || new Date().toISOString(),
      roomId,
    });

    res.json({
      success: true,
      message: "Screenshot uploaded successfully",
      filename: result.filename,
      path: result.path,
      gameId: gameId,
    });
  } catch (error) {
    console.error("Screenshot upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload screenshot",
      error: error.message,
    });
  }
});

router.get("/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    const resourcesPath = path.join(__dirname, "../resources");
    const filename = `screenshot_${gameId}.png`;
    const filepath = path.join(resourcesPath, filename);

    try {
      await fs.access(filepath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "Screenshot not found",
      });
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");

    res.sendFile(filepath);
  } catch (error) {
    console.error("Get screenshot error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve screenshot",
      error: error.message,
    });
  }
});

router.get("/list/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const screenshots = await ScreenshotService.getRecentScreenshots(limit);

    res.json({
      success: true,
      data: screenshots,
      total: screenshots.length,
      message: `Recent ${screenshots.length} screenshots retrieved successfully`,
    });
  } catch (error) {
    console.error("Get recent screenshots error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recent screenshots",
      error: error.message,
    });
  }
});

module.exports = router;