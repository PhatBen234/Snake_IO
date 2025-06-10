// socketHandler.js
const Player = require("../models/Player");
const GameController = require("../controllers/GameController");
const FoodService = require("../services/FoodService");
const RoomService = require("../services/RoomService");
const ChatService = require("../services/ChatService");

const roomHandlers = require("./handlers/roomHandlers");
const gameHandlers = require("./handlers/gameHandlers");
const connectionHandlers = require("./handlers/connectionHandlers");

const controllers = new Map();

function getRandomStartPosition(roomConfig) {
  return FoodService.getRandomPosition(roomConfig);
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    // Room related handlers
    roomHandlers.setupRoomHandlers(socket, controllers, {
      Player,
      GameController,
      RoomService,
      getRandomStartPosition,
      io,
    });

    // Game related handlers
    gameHandlers.setupGameHandlers(socket, controllers, io);

    // Connection related handlers
    connectionHandlers.setupConnectionHandlers(
      socket,
      controllers,
      RoomService
    );
    socket.on("chat-message", (data) => {
      ChatService.handleChatMessage(socket, io, data);
    });

    // Send chat history when player joins room
    socket.on("join-room", (data) => {
      // ... existing join room logic ...

      // Send chat history to newly joined player
      ChatService.sendChatHistoryToPlayer(socket, data.roomId);

      // Broadcast join message to room
      if (data.playerName) {
        ChatService.broadcastSystemMessage(
          io,
          data.roomId,
          `${data.playerName} joined the room`,
          "green"
        );
      }
    });

    // Handle player leaving room
    socket.on("quit-room", (data) => {
      // ... existing quit room logic ...

      // Broadcast leave message to room
      if (data.playerName) {
        ChatService.broadcastSystemMessage(
          io,
          data.roomId,
          `${data.playerName} left the room`,
          "orange"
        );
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);

      // Clean up chat service
      ChatService.handlePlayerDisconnect(socket.id);

      // ... existing disconnect logic ...
    });

    // ===== GAME EVENTS (existing) =====

    socket.on("create-room", (data) => {
      // ... existing create room logic ...
    });

    socket.on("start-game", (data) => {
      // ... existing start game logic ...

      // Send game start message to chat
      ChatService.broadcastSystemMessage(
        io,
        data.roomId,
        "Game started! Good luck everyone!",
        "cyan"
      );
    });

    socket.on("player-move", (data) => {
      // ... existing player move logic ...
    });

    // Add chat history request handler
    socket.on("request-chat-history", (data) => {
      if (data.roomId) {
        ChatService.sendChatHistoryToPlayer(socket, data.roomId);
      }
    });
  });
  setInterval(() => {
    ChatService.cleanupRateLimits();
  }, 5 * 60 * 1000); // Every 5 minutes
};
