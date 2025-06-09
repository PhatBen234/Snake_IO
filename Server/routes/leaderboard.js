// routes/leaderboard.js
const express = require("express");
const router = express.Router();
const LeaderboardService = require("../services/LeaderboardService");

// GET /api/leaderboard - Get top 10 players
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await LeaderboardService.getTopPlayers(limit);

    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length,
      message: `Top ${leaderboard.length} players retrieved successfully`,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve leaderboard",
      error: error.message,
    });
  }
});

module.exports = router;
