// handlers/roomHandlers.js
const { getRoomData, cleanupEmptyRoom } = require("../utils/roomUtils");

function setupRoomHandlers(socket, controllers, dependencies) {
  const { Player, GameController, RoomService, getRandomStartPosition, io } = dependencies;

  socket.on("join-room", (data) => {
    const { playerId, playerName, roomId } = data;

    // Get or create controller
    let controller = controllers.get(roomId);
    if (!controller) {
      controller = new GameController(roomId, io);
      controllers.set(roomId, controller);
    }

    // Check if room is full
    if (RoomService.isFull(controller.room)) {
      socket.emit("room-full");
      return;
    }

    // Create player with random start position
    const startPosition = getRandomStartPosition(controller.room.config);
    const player = new Player(playerId, playerName, startPosition);

    // Add player to room
    const success = controller.addPlayer(player);
    if (!success) {
      socket.emit("join-failed", { reason: "Could not join room" });
      return;
    }

    // Join socket room
    socket.join(roomId);
    socket.data = { roomId, playerId }; // Store for cleanup

    // Get room data with players info - FIX: Convert Map to Array
    const roomData = getRoomData(controller);

    // Emit success with room data
    socket.emit("joined-room", {
      roomId,
      playerId,
      roomData: roomData,
    });

    // Notify other players with updated room data
    socket.to(roomId).emit("player-joined", {
      playerId,
      playerName,
      roomData: roomData
    });

    console.log(
      `📥 Player ${playerName} (${playerId}) joined room ${roomId}`
    );
  });

  socket.on("leave-room", (data) => {
    const { roomId, playerId } = data;
    const controller = controllers.get(roomId);

    if (controller) {
      controller.removePlayer(playerId);
      socket.leave(roomId);

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
}

module.exports = {
  setupRoomHandlers
};