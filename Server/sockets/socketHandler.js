const Player = require("../models/Player");
const GameController = require("../controllers/GameController");
const FoodService = require("../services/FoodService");
const RoomService = require("../services/RoomService");

const controllers = new Map();

function getRandomStartPosition(roomConfig) {
  return FoodService.getRandomPosition(roomConfig);
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

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

      // Emit success
      socket.emit("joined-room", {
        roomId,
        playerId,
        roomData: controller.getRoomData(),
      });

      // Notify other players
      socket.to(roomId).emit("player-joined", {
        playerId,
        playerName,
      });

      console.log(
        `📥 Player ${playerName} (${playerId}) joined room ${roomId}`
      );
    });

    socket.on("player-move", (data) => {
      const { roomId, playerId, direction } = data;
      const controller = controllers.get(roomId);

      if (controller) {
        controller.changePlayerDirection(playerId, direction);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);

      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const controller = controllers.get(roomId);
      if (controller) {
        controller.removePlayer(playerId);

        // Notify other players
        socket.to(roomId).emit("player-left", { playerId });

        // Clean up empty rooms
        if (RoomService.isEmpty(controller.room)) {
          controllers.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
      }
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });
};
