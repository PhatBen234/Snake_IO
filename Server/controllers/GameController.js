const Room = require("../models/Room");
const GameService = require("../services/GameService");
const RoomService = require("../services/RoomService");
const GAME_CONSTANTS = require("../config/constants");

class GameController {
  constructor(roomId, io) {
    this.room = new Room(roomId);
    this.io = io;
    this.gameService = new GameService(this.room, io, this);
  }

  // Player Management
  addPlayer(player) {
    if (this.room.players.size >= this.room.maxPlayers) {
      return false;
    }
    this.room.players.set(player.id, player);
    // Auto-start game if conditions are met
    if (RoomService.canStart(this.room)) {
      this.gameService.start();
    }

    return true;
  }

  removePlayer(playerId) {
    const wasPlaying = this.room.status === GAME_CONSTANTS.ROOM_STATUS.PLAYING;
    this.room.players.delete(playerId);

    if (RoomService.isEmpty(this.room)) {
      this.gameService.stop();
    } else if (
      wasPlaying &&
      RoomService.getActivePlayers(this.room).length <= 1
    ) {
      this.gameService.endGame();
    }
  }

  // Game State Management
  setRoomStatus(status) {
    this.room.status = status;
  }

  setPlayerLimit(limit) {
    if (
      limit >= GAME_CONSTANTS.MIN_PLAYERS &&
      limit <= GAME_CONSTANTS.MAX_PLAYERS
    ) {
      this.room.maxPlayers = limit;
      return true;
    }
    return false;
  }

  // Food Management
  addFood(food) {
    this.room.foods.set(food.id, food);
  }

  removeFood(foodId) {
    return this.room.foods.delete(foodId);
  }

  // Player Actions
  changePlayerDirection(playerId, direction) {
    const player = this.room.players.get(playerId);
    if (player && player.alive) {
      const PlayerService = require("../services/PlayerService");
      PlayerService.changeDirection(player, direction);
    }
  }

  // Utility Methods
  resetRoom() {
    this.room.status = GAME_CONSTANTS.ROOM_STATUS.WAITING;
    this.room.players.clear();
    this.room.foods.clear();
    this.room.createdAt = Date.now();
    this.room.maxPlayers = GAME_CONSTANTS.MAX_PLAYERS;
  }

  getRoomData() {
    return RoomService.getRoomData(this.room);
  }
}

module.exports = GameController;
