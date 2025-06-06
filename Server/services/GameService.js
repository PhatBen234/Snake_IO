const FoodService = require("./FoodService");
const PlayerService = require("./PlayerService");
const CollisionService = require("./CollisionService");
const RoomService = require("./RoomService");

class GameService {
  constructor(room, io, gameController) {
    this.room = room;
    this.io = io;
    this.gameController = gameController; // Reference to GameController
    this.gameInterval = null;
  }

  start() {
    if (this.room.status === "playing") return;

    this.gameController.setRoomStatus("playing");
    FoodService.spawnFood(this.room);

    this.gameInterval = setInterval(() => {
      this.update();
    }, 1000 / 10); // 10 FPS

    // this.io.to(this.room.id).emit("game-started");
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

    // Move all players
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

    // FIXED: Chỉ kết thúc khi còn 0 players hoặc all players dead
    const activePlayers = RoomService.getActivePlayers(this.room);
    if (activePlayers.length === 0) {
      this.endGame();
      return;
    }

    // Hoặc nếu muốn kết thúc khi chỉ còn 1 winner:
    // if (activePlayers.length === 1 && this.room.players.size > 1) {
    //   this.endGame();
    //   return;
    // }

    // Emit game state
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

    // Get all players (both alive and dead) to find the highest score
    const allPlayers = Array.from(this.room.players.values());

    // Find the player with the highest score
    const winner = allPlayers.reduce((prev, current) => {
      return prev.score > current.score ? prev : current;
    });

    this.io.to(this.room.id).emit("game-ended", {
      winner: winner ? winner.name : null, // Changed from winner.id to winner.name
      scores: allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
      })),
    });
  }

  emitGameState() {
    const gameState = {
      players: RoomService.getPlayersData(this.room),
      foods: RoomService.getFoodsData(this.room),
    };

    this.io.to(this.room.id).emit("game-state", gameState);
  }
}

module.exports = GameService;
