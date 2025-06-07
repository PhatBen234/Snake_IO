// handlers/gameHandlers.js
function setupGameHandlers(socket, controllers, io) {
  socket.on("start-game", (data) => {
    const { roomId } = data;
    const controller = controllers.get(roomId);

    if (!controller) return;

    if (controller.room.players.size < 2) {
      socket.emit("start-game-failed", {
        reason: "Need at least 2 players to start",
      });
      return;
    }

    controller.gameService.start();
    io.to(roomId).emit("game-started", { roomId });
  });

  socket.on("player-move", (data) => {
    const { roomId, playerId, direction } = data;
    const controller = controllers.get(roomId);

    if (controller) {
      controller.changePlayerDirection(playerId, direction);
    }
  });

  socket.on("quit-room", (data) => {
    const { roomId, playerId } = data;

    if (!roomId || !playerId) {
      socket.emit("quit-room-failed", {
        reason: "Missing room or player info",
      });
      return;
    }

    const controller = controllers.get(roomId);
    if (!controller) {
      socket.emit("quit-room-failed", { reason: "Room not found" });
      return;
    }

    const player = controller.room.players.get(playerId);
    if (!player) {
      socket.emit("quit-room-failed", { reason: "Player not found" });
      return;
    }

    // Handle quit based on game state
    if (controller.room.status === "playing") {
      controller.gameService.handlePlayerQuit(playerId);
    }

    // Remove player and notify others
    controller.room.players.delete(playerId);
    socket.leave(roomId);
    socket
      .to(roomId)
      .emit("player-left", { playerId, playerName: player.name });
    socket.emit("quit-room-success");

    // Clean up empty room
    if (controller.room.players.size === 0) {
      controllers.delete(roomId);
    }
  });
}

module.exports = { setupGameHandlers };
