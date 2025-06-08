const FoodService = require("./FoodService");
const PlayerService = require("./PlayerService");
const CollisionService = require("./CollisionService");
const RoomService = require("./RoomService");

class GameService {
  constructor(room, io, gameController) {
    this.room = room;
    this.io = io;
    this.gameController = gameController;
    this.gameInterval = null;
  }

  start() {
    if (this.room.status === "playing") return;

    this.gameController.setRoomStatus("playing");
    FoodService.spawnFood(this.room);

    this.gameInterval = setInterval(() => {
      this.update();
    }, 1000 / 10); // 10 FPS
  }

  stop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    this.gameController.setRoomStatus("finished");
    this.io.to(this.room.id).emit("game-stopped");
  }

  update() {
    if (this.room.status !== "playing") return;

    // Move all alive players
    this.room.players.forEach((player) => {
      if (player.alive) {
        PlayerService.movePlayer(player);
      }
    });

    // Check collisions
    CollisionService.checkAllCollisions(this.room);

    // Check food consumption
    this.checkFoodConsumption();

    // Spawn new food if needed
    FoodService.spawnFood(this.room);

    const activePlayers = RoomService.getActivePlayers(this.room);

    if (activePlayers.length === 0) {
      this.endGame();
      return;
    }

    this.emitGameState();
  }

  checkFoodConsumption() {
    this.room.players.forEach((player) => {
      if (!player.alive) return;

      this.room.foods.forEach((food) => {
        if (FoodService.checkFoodCollision(player, food)) {
          FoodService.consumeFood(player, food);
          this.gameController.removeFood(food.id);
        }
      });
    });
  }

  endGame() {
    this.stop();

    const allPlayers = Array.from(this.room.players.values());
    
    // Tạo leaderboard data - sắp xếp theo điểm số giảm dần
    const leaderboard = allPlayers
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Chỉ lấy top 3
      .map((player, index) => ({
        rank: index + 1,
        id: player.id,
        name: player.name,
        score: player.score,
        alive: player.alive
      }));

    let winner = null;
    if (allPlayers.length > 0) {
      winner = allPlayers.reduce((prev, current) => {
        return prev.score > current.score ? prev : current;
      });
    }

    const gameResult = {
      winner: winner ? {
        id: winner.id,
        name: winner.name,
        score: winner.score
      } : null,
      leaderboard: leaderboard,
      totalPlayers: allPlayers.length,
      gameTime: Date.now() - this.room.createdAt,
      scores: allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        status: p.alive ? "alive" : "dead",
      })),
    };

    // Emit game ended event với leaderboard data
    this.io.to(this.room.id).emit("game-ended", gameResult);

    // Log kết quả game
    console.log(`🏁 Game ${this.room.id} ended:`, {
      winner: winner ? winner.name : "No winner",
      topScores: leaderboard.map(p => `${p.name}: ${p.score}`),
      totalPlayers: allPlayers.length
    });
  }

  emitGameState() {
    const gameState = {
      players: RoomService.getPlayersData(this.room),
      foods: RoomService.getFoodsData(this.room),
    };

    this.io.to(this.room.id).emit("game-state", gameState);
  }

  handlePlayerQuit(playerId) {
    const player = this.room.players.get(playerId);
    if (player) {
      // Set score to 0 and mark as dead for AFK/quit players
      player.score = 0;
      player.alive = false;

      // Check if game should end after this quit
      const activePlayers = RoomService.getActivePlayers(this.room);
      if (activePlayers.length <= 1 && this.room.players.size > 1) {
        setTimeout(() => this.endGame(), 1000);
      }
    }
  }

  // NEW: Method to get current leaderboard (for mid-game requests)
  getCurrentLeaderboard() {
    const allPlayers = Array.from(this.room.players.values());
    
    return allPlayers
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((player, index) => ({
        rank: index + 1,
        id: player.id,
        name: player.name,
        score: player.score,
        alive: player.alive
      }));
  }
}

module.exports = GameService;