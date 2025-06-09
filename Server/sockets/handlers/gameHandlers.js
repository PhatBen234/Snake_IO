const ValidationMiddleware = require("../../middleware/ValidationMiddleware");
const GameEventEmitter = require("../utils/GameEventEmitter");
const GAME_CONSTANTS = require("../../config/constants");

function setupGameHandlers(socket, controllers, io) {
  socket.on("start-game", (data) => {
    const { roomId } = data;
    const controller = controllers.get(roomId);

    if (!controller) return;

    if (controller.room.players.size < GAME_CONSTANTS.MIN_PLAYERS) {
      GameEventEmitter.emitStartGameFailed(
        socket,
        `Need at least ${GAME_CONSTANTS.MIN_PLAYERS} players to start`
      );
      return;
    }

    controller.gameService.start();
    GameEventEmitter.emitGameStarted(io, roomId);
  });

  socket.on("player-move", (data) => {
    const validation = ValidationMiddleware.validatePlayerMove(data);
    if (!validation.isValid) return;

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
    if (controller.room.status === GAME_CONSTANTS.ROOM_STATUS.PLAYING) {
      // QUAN TRỌNG: Sử dụng method mới để đảm bảo điểm được set trước khi tính winner
      controller.gameService.handlePlayerQuitAndCheckEnd(playerId);

      socket.to(roomId).emit("player-left", {
        playerId,
        playerName: player.name,
        reason: "quit",
      });
      socket.leave(roomId);
      socket.emit("quit-room-success");
    } else {
      // Game not started - normal quit
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

  // THÊM: Handle disconnect event (khi người chơi đóng browser/mất mạng)
  socket.on("disconnect", () => {
    // Tìm player trong tất cả các rooms
    for (const [roomId, controller] of controllers.entries()) {
      const player = controller.room.players.get(socket.id);
      if (player) {
        console.log(`Player ${player.name} disconnected from room ${roomId}`);

        if (controller.room.status === GAME_CONSTANTS.ROOM_STATUS.PLAYING) {
          // Xử lý disconnect như quit trong game
          controller.gameService.handlePlayerQuitAndCheckEnd(socket.id);

          socket.to(roomId).emit("player-left", {
            playerId: socket.id,
            playerName: player.name,
            reason: "disconnect",
          });
        } else {
          // Game chưa bắt đầu - xóa player khỏi room
          controller.room.players.delete(socket.id);
          socket.to(roomId).emit("player-left", {
            playerId: socket.id,
            playerName: player.name,
            reason: "disconnect",
          });
        }

        // Clean up empty room
        if (controller.room.players.size === 0) {
          controllers.delete(roomId);
        }

        break; // Player chỉ có thể ở trong 1 room
      }
    }
  });
}

module.exports = { setupGameHandlers };
