const Player = require("../models/Player");
const GameController = require("../controllers/GameController");

const controllers = new Map();

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("join-room", (data) => {
      const { playerId, playerName, roomId } = data;

      let controller = controllers.get(roomId);
      if (!controller) {
        controller = new GameController(roomId, io);
        controllers.set(roomId, controller);
      }

      const player = new Player(playerId, playerName, {
        x: Math.random() * controller.room.config.width,
        y: Math.random() * controller.room.config.height,
      });

      const success = controller.addPlayer(player);
      if (!success) {
        socket.emit("room-full");
        return;
      }

      socket.join(roomId);
      socket.emit("joined-room", { roomId, playerId });

      if (
        controller.room.players.size >= 2 &&
        controller.room.status !== "playing"
      ) {
        controller.startGame();
      }

      console.log(
        `📥 Player ${playerName} (${playerId}) joined room ${roomId}`
      );
    });

    socket.on("player-move", (data) => {
      const { roomId, playerId, direction } = data;
      const controller = controllers.get(roomId);
      if (!controller) return;

      const player = controller.room.players.get(playerId);
      if (player) player.setDirection(direction);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);

      for (const [roomId, controller] of controllers) {
        if (controller.room.players.has(socket.id)) {
          controller.removePlayer(socket.id);
          io.to(roomId).emit("player-left", { playerId: socket.id });

          if (controller.room.players.size === 0) {
            controller.stopGame();
            controllers.delete(roomId);
          }
          break;
        }
      }
    });
  });
};
