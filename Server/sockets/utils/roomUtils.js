// // handlers/roomUtils.js
// function getRoomData(controller) {
//   return {
//     roomId: controller.room.id,
//     maxPlayers: controller.room.maxPlayers || 4,
//     players: Array.from(controller.room.players.values()).map(p => ({
//       id: p.id,
//       name: p.name,
//       ready: p.ready || false
//     }))
//   };
// }

// function cleanupEmptyRoom(controllers, roomId, controller, RoomService) {
//   if (RoomService.isEmpty(controller.room)) {
//     controllers.delete(roomId);
//     console.log(`🗑️ Room ${roomId} deleted (empty)`);
//   }
// }

// module.exports = {
//   getRoomData,
//   cleanupEmptyRoom
// };

// handlers/roomUtils.js
function getRoomData(controller) {
  return {
    roomId: controller.room.id,
    maxPlayers: controller.room.maxPlayers || 4,
    players: Array.from(controller.room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      ready: p.ready || false,
      isHost: p.isHost || false  // Thêm thông tin chủ phòng
    }))
  };
}

function cleanupEmptyRoom(controllers, roomId, controller, RoomService) {
  if (RoomService.isEmpty(controller.room)) {
    controllers.delete(roomId);
    console.log(`🗑️ Room ${roomId} deleted (empty)`);
  }
}

module.exports = {
  getRoomData,
  cleanupEmptyRoom
};