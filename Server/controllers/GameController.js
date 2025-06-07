// controllers/GameController.js - Fixed để truyền reference cho GameService
const Room = require("../models/Room");
const GameService = require("../services/GameService");
const RoomService = require("../services/RoomService");
const PlayerService = require("../services/PlayerService");

class GameController {
  constructor(roomId, io) {
    this.room = new Room(roomId);
    this.io = io;
    // Truyền reference của GameController cho GameService
    this.gameService = new GameService(this.room, io, this);
  }

  // Logic từ Room model
  addPlayer(player) {
    if (this.room.players.size >= this.room.maxPlayers) return false;
    this.room.players.set(player.id, player);

    if (RoomService.canStart(this.room)) {
      this.gameService.start();
    }
    return true;
  }

  removePlayer(playerId) {
    this.room.players.delete(playerId);

    if (RoomService.isEmpty(this.room)) {
      this.gameService.stop();
    } else if (
      RoomService.getActivePlayers(this.room).length <= 1 &&
      this.room.status === "playing"
    ) {
      this.gameService.endGame();
    }
  }

  addFood(food) {
    this.room.foods.set(food.id, food);
  }

  removeFood(foodId) {
    return this.room.foods.delete(foodId);
  }

  setRoomStatus(status) {
    this.room.status = status;
  }

  // Thêm method để set player limit
  // setPlayerLimit(limit) {
  //   // Validate: chỉ cho phép từ 2-4 players
  //   if (limit >= 2 && limit <= 4) {
  //     this.room.maxPlayers = limit;
  //     return true;
  //   }
  //   return false;
  // }

  // resetRoom() {
  //   this.room.status = "waiting";
  //   this.room.players.clear();
  //   this.room.foods.clear();
  //   this.room.createdAt = Date.now();
  //   // Reset về default khi reset room
  //   this.room.maxPlayers = 4;
  // }

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
