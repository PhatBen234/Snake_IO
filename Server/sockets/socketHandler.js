const Player = require("../models/Player");
const GameController = require("../controllers/GameController");
const FoodService = require("../services/FoodService");
const RoomService = require("../services/RoomService");
const ChatService = require("../services/ChatService");
const roomHandlers = require("./handlers/roomHandlers");
const gameHandlers = require("./handlers/gameHandlers");
const connectionHandlers = require("./handlers/connectionHandlers");
const chatHandlers = require("./handlers/chatHandlers");

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

    // Chat related handlers
    chatHandlers.setupChatHandlers(socket, io);
  });

  // Cleanup rate limits every 5 minutes
  setInterval(() => {
    ChatService.cleanupRateLimits();
  }, 5 * 60 * 1000);
};