// handlers/gameHandlers.js
function setupGameHandlers(socket, controllers, io) {
  socket.on("start-game", (data) => {
    const { roomId, playerId } = data;
    const controller = controllers.get(roomId);

    if (controller) {
      // Check if player can start game (maybe only room creator or when room is full)
      const canStart = controller.room.players.size >= 2; // Min 2 players to start

      if (canStart) {
        // Start the game
        controller.gameService.start();

        // Notify all players in room
        io.to(roomId).emit("game-started", {
          roomId: roomId,
          players: controller.room.players.size,
        });

        console.log(`🚀 Game started in room ${roomId}`);
      } else {
        socket.emit("start-game-failed", {
          reason: "Need at least 2 players to start",
        });
      }
    }
  });

  socket.on("player-move", (data) => {
    const { roomId, playerId, direction } = data;
    const controller = controllers.get(roomId);

    if (controller) {
      controller.changePlayerDirection(playerId, direction);
    }
  });
}

module.exports = {
  setupGameHandlers,
};
