const FoodService = require("./FoodService");
const PlayerService = require("./PlayerService");
const CollisionService = require("./CollisionService");
const RoomService = require("./RoomService");
const LeaderboardService = require("./LeaderboardService");

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
    }, 1000 / 10); 
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

    this.room.players.forEach((player) => {
      if (player.alive) {
        PlayerService.movePlayer(player);
      }
    });

    CollisionService.checkAllCollisions(this.room);

    this.checkFoodConsumption();

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
    let isDraw = false;

    if (allPlayers.length > 0) {
      const validPlayers = allPlayers.filter((p) => p.score > 0);

      if (validPlayers.length === 0) {
        isDraw = true;
        winner = null;
      } else {
        const maxScore = Math.max(...validPlayers.map((p) => p.score));
        const topPlayers = validPlayers.filter((p) => p.score === maxScore);

        if (topPlayers.length > 1) {
          isDraw = true;
          winner = null;
        } else {
          winner = topPlayers[0].name;
        }
      }
    }

    LeaderboardService.saveGameResults(allPlayers).catch(console.error);

    this.io.to(this.room.id).emit("game-ended", {
      winner: winner,
      isDraw: isDraw,
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
      player.score = 0;
      player.alive = false;

      console.log(`Player ${player.name} quit - Score set to 0`); 

      const activePlayers = RoomService.getActivePlayers(this.room);
      if (activePlayers.length <= 1 && this.room.players.size > 1) {
        setTimeout(() => this.endGame(), 100);
      }
    }
  }

  handlePlayerQuitAndCheckEnd(playerId) {
    this.handlePlayerQuit(playerId);

    const activePlayers = RoomService.getActivePlayers(this.room);
    if (activePlayers.length <= 1 && this.room.players.size > 1) {
      this.endGame();
    }
  }
}

module.exports = GameService;