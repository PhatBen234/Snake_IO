const FoodService = require("./FoodService");
const PlayerService = require("./PlayerService");
const CollisionService = require("./CollisionService");
const RoomService = require("./RoomService");

class GameService {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.gameInterval = null;
  }

  start() {
    if (this.room.status === "playing") return;

    this.room.setStatus("playing");
    FoodService.spawnFood(this.room);

    this.gameInterval = setInterval(() => {
      this.update();
    }, 1000 / 10); // 10 FPS

    this.io.to(this.room.id).emit("game-started");
  }

  stop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    this.room.setStatus("finished");
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

    // Check game end condition
    if (RoomService.getActivePlayers(this.room).length <= 1) {
      this.endGame();
      return;
    }

    // Emit game state
    this.emitGameState();
  }

  checkFoodConsumption() {
    this.room.players.forEach((player) => {
      if (!player.alive) return;

      this.room.foods.forEach((food) => {
        if (FoodService.checkFoodCollision(player, food)) {
          FoodService.consumeFood(player, food);
          this.room.removeFood(food.id);
        }
      });
    });
  }

  endGame() {
    this.stop();
    const activePlayers = RoomService.getActivePlayers(this.room);
    const winner = activePlayers[0];

    this.io.to(this.room.id).emit("game-ended", {
      winner: winner ? winner.id : null,
      scores: Array.from(this.room.players.values()).map((p) => ({
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
