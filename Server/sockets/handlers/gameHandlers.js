// handlers/gameHandlers.js - Clean version
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
      // Handle quit - GameService sẽ tự check endGame
      controller.gameService.handlePlayerQuit(playerId);

      // Notify others về việc quit
      socket.to(roomId).emit("player-left", {
        playerId,
        playerName: player.name,
        reason: "quit",
      });

      // Remove socket khỏi room nhưng giữ player data
      socket.leave(roomId);
      socket.emit("quit-room-success");

      // Room cleanup sẽ được handle trong GameService.endGame()
    } else {
      // Game chưa bắt đầu - xử lý quit bình thường
      controller.room.players.delete(playerId);
      socket.leave(roomId);

      socket.to(roomId).emit("player-left", {
        playerId,
        playerName: player.name,
        reason: "quit",
      });

      socket.emit("quit-room-success");

      // Clean up empty room
      if (controller.room.players.size === 0) {
        controllers.delete(roomId);
      }
    }
  });
}

module.exports = { setupGameHandlers };
