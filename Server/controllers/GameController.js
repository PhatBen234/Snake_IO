// controllers/GameController.js
const Room = require("../models/Room");
const GameService = require("../services/GameService");
const RoomService = require("../services/RoomService");
const PlayerService = require("../services/PlayerService");

class GameController {
  constructor(roomId, io) {
    this.room = new Room(roomId);
    this.gameService = new GameService(this.room, io);
    this.io = io;
  }

  addPlayer(player) {
    const success = this.room.addPlayer(player);
    if (success && RoomService.canStart(this.room)) {
      this.gameService.start();
    }
    return success;
  }

  removePlayer(playerId) {
    this.room.removePlayer(playerId);

    if (RoomService.isEmpty(this.room)) {
      this.gameService.stop();
    } else if (
      RoomService.getActivePlayers(this.room).length <= 1 &&
      this.room.status === "playing"
    ) {
      this.gameService.endGame();
    }
  }

  changePlayerDirection(playerId, direction) {
    const player = this.room.players.get(playerId);
    if (player && player.alive) {
      PlayerService.changeDirection(player, direction);
    }
  }

  getRoomData() {
    return RoomService.getRoomData(this.room);
  }
}

module.exports = GameController;
