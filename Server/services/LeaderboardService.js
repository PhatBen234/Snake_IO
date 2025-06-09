// services/LeaderboardService.js
const { getDB } = require("../db/firebaseService");

class LeaderboardService {
  constructor() {
    this.db = null;
    this.collection = "leaderboard";
  }

  // Lazy initialize database connection
  getDatabase() {
    if (!this.db) {
      this.db = getDB();
    }
    return this.db;
  }

  // Save player score (only if it's better than existing)
  async savePlayerScore(playerId, playerName, score) {
    try {
      const db = this.getDatabase();
      const docRef = db.collection(this.collection).doc(playerId);
      const doc = await docRef.get();

      // If player doesn't exist OR new score is higher
      if (!doc.exists || doc.data().score < score) {
        await docRef.set({
          playerId: playerId,
          playerName: playerName,
          score: score,
          timestamp: new Date(),
        });
        return true;
      }

      return false; // Score not improved
    } catch (error) {
      throw error;
    }
  }

  // Get top 10 players
  async getTopPlayers(limit = 10) {
    try {
      const db = this.getDatabase();
      const snapshot = await db
        .collection(this.collection)
        .orderBy("score", "desc")
        .limit(limit)
        .get();

      const leaderboard = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        leaderboard.push({
          rank: leaderboard.length + 1,
          playerId: data.playerId,
          playerName: data.playerName,
          score: data.score,
          timestamp: data.timestamp,
        });
      });

      return leaderboard;
    } catch (error) {
      throw error;
    }
  }

  // Save multiple players from game end
  async saveGameResults(players) {
    try {
      const promises = players.map((player) =>
        this.savePlayerScore(player.id, player.name, player.score)
      );

      await Promise.all(promises);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new LeaderboardService();
