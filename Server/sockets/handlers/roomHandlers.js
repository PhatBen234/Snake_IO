// // handlers/roomHandlers.js
// const { getRoomData, cleanupEmptyRoom } = require("../utils/roomUtils");

// function setupRoomHandlers(socket, controllers, dependencies) {
//   const { Player, GameController, RoomService, getRandomStartPosition, io } = dependencies;

//   socket.on("join-room", (data) => {
//     const { playerId, playerName, roomId } = data;

//     // Get or create controller
//     let controller = controllers.get(roomId);
//     if (!controller) {
//       controller = new GameController(roomId, io);
//       controllers.set(roomId, controller);
//     }

//     // Check if room is full
//     if (RoomService.isFull(controller.room)) {
//       socket.emit("room-full");
//       return;
//     }

//     // Create player with random start position
//     const startPosition = getRandomStartPosition(controller.room.config);
//     const player = new Player(playerId, playerName, startPosition);

//     // Add player to room
//     const success = controller.addPlayer(player);
//     if (!success) {
//       socket.emit("join-failed", { reason: "Could not join room" });
//       return;
//     }

//     // Join socket room
//     socket.join(roomId);
//     socket.data = { roomId, playerId }; // Store for cleanup

//     // Get room data with players info - FIX: Convert Map to Array
//     const roomData = getRoomData(controller);

//     // Emit success with room data
//     socket.emit("joined-room", {
//       roomId,
//       playerId,
//       roomData: roomData,
//     });

//     // Notify other players with updated room data
//     socket.to(roomId).emit("player-joined", {
//       playerId,
//       playerName,
//       roomData: roomData
//     });

//     console.log(
//       `📥 Player ${playerName} (${playerId}) joined room ${roomId}`
//     );
//   });

//   socket.on("leave-room", (data) => {
//     const { roomId, playerId } = data;
//     const controller = controllers.get(roomId);

//     if (controller) {
//       controller.removePlayer(playerId);
//       socket.leave(roomId);

//       // Get updated room data - FIX: Convert Map to Array
//       const roomData = getRoomData(controller);

//       // Notify other players
//       socket.to(roomId).emit("player-left", { 
//         playerId,
//         roomData: roomData
//       });

//       // Clean up empty rooms
//       cleanupEmptyRoom(controllers, roomId, controller, RoomService);
//     }
//   });
// }

// module.exports = {
//   setupRoomHandlers
// };

// handlers/roomHandlers.js
const { getRoomData, cleanupEmptyRoom } = require("../utils/roomUtils");

function setupRoomHandlers(socket, controllers, dependencies) {
  const { Player, GameController, RoomService, getRandomStartPosition, io } = dependencies;

  // Tạo phòng mới
  socket.on("create-room", (data) => {
    const { playerId, playerName } = data;
    
    // Tạo roomId ngẫu nhiên
    const roomId = `room_${Math.random().toString(36).substr(2, 8)}`;

    // Tạo controller mới
    const controller = new GameController(roomId, io);
    controllers.set(roomId, controller);

    // Tạo player với random start position
    const startPosition = getRandomStartPosition(controller.room.config);
    const player = new Player(playerId, playerName, startPosition);
    
    // Đánh dấu player này là chủ phòng
    player.isHost = true;

    // Add player to room
    const success = controller.addPlayer(player);
    if (!success) {
      socket.emit("create-failed", { reason: "Could not create room" });
      return;
    }

    // Join socket room
    socket.join(roomId);
    socket.data = { roomId, playerId, isHost: true };

    // Get room data
    const roomData = getRoomData(controller);

    // Emit success với thông tin chủ phòng
    socket.emit("room-created", {
      roomId,
      playerId,
      isHost: true,
      roomData: roomData,
    });

    console.log(
      `🏠 Room ${roomId} created by ${playerName} (${playerId})`
    );
  });

  socket.on("join-room", (data) => {
    const { playerId, playerName, roomId } = data;

    // Kiểm tra xem phòng có tồn tại không
    let controller = controllers.get(roomId);
    if (!controller) {
      socket.emit("join-failed", { reason: "Room not found" });
      return;
    }

    // Check if room is full
    if (RoomService.isFull(controller.room)) {
      socket.emit("room-full");
      return;
    }

    // Create player with random start position
    const startPosition = getRandomStartPosition(controller.room.config);
    const player = new Player(playerId, playerName, startPosition);
    
    // Player tham gia không phải là chủ phòng
    player.isHost = false;

    // Add player to room
    const success = controller.addPlayer(player);
    if (!success) {
      socket.emit("join-failed", { reason: "Could not join room" });
      return;
    }

    // Join socket room
    socket.join(roomId);
    socket.data = { roomId, playerId, isHost: false };

    // Get room data with players info
    const roomData = getRoomData(controller);

    // Emit success với thông tin không phải chủ phòng
    socket.emit("joined-room", {
      roomId,
      playerId,
      isHost: false,
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
      const player = controller.room.players.get(playerId);
      const wasHost = player && player.isHost;
      
      controller.removePlayer(playerId);
      socket.leave(roomId);

      // Get updated room data
      const roomData = getRoomData(controller);

      // Notify other players
      socket.to(roomId).emit("player-left", { 
        playerId,
        roomData: roomData,
        wasHost: wasHost
      });

      // Nếu chủ phòng rời đi, chọn chủ phòng mới
      if (wasHost && controller.room.players.size > 0) {
        const newHost = Array.from(controller.room.players.values())[0];
        newHost.isHost = true;
        
        // Thông báo chủ phòng mới
        const updatedRoomData = getRoomData(controller);
        io.to(roomId).emit("new-host", {
          newHostId: newHost.id,
          roomData: updatedRoomData
        });
      }

      // Clean up empty rooms
      cleanupEmptyRoom(controllers, roomId, controller, RoomService);
    }
  });
}

module.exports = {
  setupRoomHandlers
};