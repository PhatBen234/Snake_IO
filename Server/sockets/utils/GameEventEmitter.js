class GameEventEmitter {
  static emitRoomCreated(socket, data) {
    socket.emit("room-created", data);
  }

  static emitRoomJoined(socket, data) {
    socket.emit("joined-room", data);
  }

  static emitJoinFailed(socket, reason) {
    socket.emit("join-failed", { reason });
  }

  static emitCreateFailed(socket, reason) {
    socket.emit("create-failed", { reason });
  }

  static emitPlayerJoined(socket, roomId, data) {
    socket.to(roomId).emit("player-joined", data);
  }

  static emitPlayerLeft(socket, roomId, data) {
    socket.to(roomId).emit("player-left", data);
  }

  static emitNewHost(io, roomId, data) {
    io.to(roomId).emit("new-host", data);
  }

  static emitGameState(io, roomId, gameState) {
    io.to(roomId).emit("game-state", gameState);
  }

  static emitGameEnded(io, roomId, results) {
    io.to(roomId).emit("game-ended", results);
  }

  static emitGameStarted(io, roomId) {
    io.to(roomId).emit("game-started", { roomId });
  }

  static emitStartGameFailed(socket, reason) {
    socket.emit("start-game-failed", { reason });
  }
}

module.exports = GameEventEmitter;
