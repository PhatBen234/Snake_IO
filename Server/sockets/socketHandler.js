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

      // Get room data with players info - FIX: Convert Map to Array
      const roomData = {
        roomId: roomId,
        maxPlayers: controller.room.maxPlayers || 4,
        players: Array.from(controller.room.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          ready: p.ready || false
        }))
      };

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
            players: controller.room.players.size
          });
          
          console.log(`🚀 Game started in room ${roomId}`);
        } else {
          socket.emit("start-game-failed", { 
            reason: "Need at least 2 players to start" 
          });
        }
      }
    });

    socket.on("leave-room", (data) => {
      const { roomId, playerId } = data;
      const controller = controllers.get(roomId);

      if (controller) {
        controller.removePlayer(playerId);
        socket.leave(roomId);

        // Get updated room data - FIX: Convert Map to Array
        const roomData = {
          roomId: roomId,
          maxPlayers: controller.room.maxPlayers || 4,
          players: Array.from(controller.room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            ready: p.ready || false
          }))
        };

        // Notify other players
        socket.to(roomId).emit("player-left", { 
          playerId,
          roomData: roomData
        });

        // Clean up empty rooms
        if (RoomService.isEmpty(controller.room)) {
          controllers.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
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

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);

      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const controller = controllers.get(roomId);
      if (controller) {
        controller.removePlayer(playerId);

        // Get updated room data - FIX: Convert Map to Array  
        const roomData = {
          roomId: roomId,
          maxPlayers: controller.room.maxPlayers || 4,
          players: Array.from(controller.room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            ready: p.ready || false
          }))
        };

        // Notify other players
        socket.to(roomId).emit("player-left", { 
          playerId,
          roomData: roomData
        });

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