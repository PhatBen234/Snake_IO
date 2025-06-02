const Room = require("../models/Room");
const RoomController = require("./RoomController");
const GameService = require("../services/GameService");

class GameController {
  constructor(roomId, io) {
    const room = new Room(roomId);
    this.roomController = new RoomController(room);
    this.room = this.roomController.room;
    this.io = io;
    this.interval = null;
  }

  addPlayer(player) {
    return this.roomController.addPlayer(player);
  }

  removePlayer(playerId) {
    this.roomController.removePlayer(playerId);
  }

  startGame() {
    this.room.status = "playing";
    this.gameService = new GameService(this.room, this.io);

    this.interval = setInterval(() => {
      this.gameService.update();
    }, 1000 / 10);
  }

  stopGame() {
    clearInterval(this.interval);
    this.roomController.resetRoom();
  }
}
module.exports = GameController;
