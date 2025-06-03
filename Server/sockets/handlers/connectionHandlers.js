// handlers/connectionHandlers.js
const { getRoomData, cleanupEmptyRoom } = require("../utils/roomUtils");

function setupConnectionHandlers(socket, controllers, RoomService) {
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);

    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const controller = controllers.get(roomId);
    if (controller) {
      controller.removePlayer(playerId);

      // Get updated room data - FIX: Convert Map to Array  
      const roomData = getRoomData(controller);

      // Notify other players
      socket.to(roomId).emit("player-left", { 
        playerId,
        roomData: roomData
      });

      // Clean up empty rooms
      cleanupEmptyRoom(controllers, roomId, controller, RoomService);
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
}

module.exports = {
  setupConnectionHandlers
};