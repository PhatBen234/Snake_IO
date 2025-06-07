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

    let winner = null;
    if (allPlayers.length > 0) {
      winner = allPlayers.reduce((prev, current) => {
        return prev.score > current.score ? prev : current;
      });
    }

    // Emit game ended event
    this.io.to(this.room.id).emit("game-ended", {
      winner: winner ? winner.name : null,
      scores: allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        status: p.alive ? "alive" : "dead",
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
}

module.exports = GameService;
