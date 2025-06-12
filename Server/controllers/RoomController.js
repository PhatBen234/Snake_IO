const ValidationMiddleware = require("../middleware/ValidationMiddleware");
const GameEventEmitter = require("../sockets/utils/GameEventEmitter");
const { getRoomData, cleanupEmptyRoom } = require("../sockets/utils/roomUtils");
const GAME_CONSTANTS = require("../config/constants");

class RoomController {
  constructor(dependencies) {
    this.Player = dependencies.Player;
    this.GameController = dependencies.GameController;
    this.RoomService = dependencies.RoomService;
    this.getRandomStartPosition = dependencies.getRandomStartPosition;
    this.io = dependencies.io;
    this.controllers = dependencies.controllers;
  }

  createRoom(socket, data) {
    const validation = ValidationMiddleware.validateRoomCreation(data);
    if (!validation.isValid) {
      GameEventEmitter.emitCreateFailed(socket, validation.errors.join(", "));
      return;
    }

    const { playerId, playerName, playerLimit = 4 } = data;

    const roomId = this.generateRoomId();

    const controller = new this.GameController(roomId, this.io);
    controller.setPlayerLimit(playerLimit);
    this.controllers.set(roomId, controller);

    const player = this.createPlayer(
      playerId,
      playerName,
      controller.room.config,
      true
    );
    const success = controller.addPlayer(player);

    if (!success) {
      GameEventEmitter.emitCreateFailed(socket, "Could not create room");
      return;
    }

    socket.join(roomId);
    socket.data = { roomId, playerId, isHost: true };

    const roomData = getRoomData(controller);
    GameEventEmitter.emitRoomCreated(socket, {
      roomId,
      playerId,
      isHost: true,
      roomData,
    });
  }

  joinRoom(socket, data) {
    const validation = ValidationMiddleware.validateRoomJoin(data);
    if (!validation.isValid) {
      GameEventEmitter.emitJoinFailed(socket, validation.errors.join(", "));
      return;
    }

    const { playerId, playerName, roomId } = data;

    const controller = this.controllers.get(roomId);
    if (!controller) {
      GameEventEmitter.emitJoinFailed(socket, "Room not found");
      return;
    }

    if (this.RoomService.isFull(controller.room)) {
      socket.emit("room-full");
      return;
    }

    const player = this.createPlayer(
      playerId,
      playerName,
      controller.room.config,
      false
    );
    const success = controller.addPlayer(player);

    if (!success) {
      GameEventEmitter.emitJoinFailed(socket, "Could not join room");
      return;
    }

    socket.join(roomId);
    socket.data = { roomId, playerId, isHost: false };

    const roomData = getRoomData(controller);
    GameEventEmitter.emitRoomJoined(socket, {
      roomId,
      playerId,
      isHost: false,
      roomData,
    });

    GameEventEmitter.emitPlayerJoined(socket, roomId, {
      playerId,
      playerName,
      roomData,
    });

  }

  leaveRoom(socket, data) {
    const { roomId, playerId } = data;
    const controller = this.controllers.get(roomId);

    if (!controller) return;

    const player = controller.room.players.get(playerId);
    const wasHost = player && player.isHost;

    controller.removePlayer(playerId);
    socket.leave(roomId);

    const roomData = getRoomData(controller);
    GameEventEmitter.emitPlayerLeft(socket, roomId, {
      playerId,
      roomData,
      wasHost,
    });

    if (wasHost && controller.room.players.size > 0) {
      this.transferHost(controller, roomId);
    }

    cleanupEmptyRoom(this.controllers, roomId, controller, this.RoomService);
  }

  generateRoomId() {
    return `room_${Math.random().toString(36).substr(2, 8)}`;
  }

  createPlayer(playerId, playerName, roomConfig, isHost) {
    const startPosition = this.getRandomStartPosition(roomConfig);
    const player = new this.Player(playerId, playerName, startPosition);
    player.isHost = isHost;
    return player;
  }

  transferHost(controller, roomId) {
    const newHost = Array.from(controller.room.players.values())[0];
    newHost.isHost = true;

    const updatedRoomData = getRoomData(controller);
    GameEventEmitter.emitNewHost(this.io, roomId, {
      newHostId: newHost.id,
      roomData: updatedRoomData,
    });
  }
}

module.exports = RoomController;