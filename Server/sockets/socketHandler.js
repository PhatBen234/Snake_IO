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

    roomHandlers.setupRoomHandlers(socket, controllers, {
      Player,
      GameController,
      RoomService,
      getRandomStartPosition,
      io,
    });

    gameHandlers.setupGameHandlers(socket, controllers, io);

    connectionHandlers.setupConnectionHandlers(
      socket,
      controllers,
      RoomService
    );

    chatHandlers.setupChatHandlers(socket, io);
  });

  setInterval(() => {
    ChatService.cleanupRateLimits();
  }, 5 * 60 * 1000);
};