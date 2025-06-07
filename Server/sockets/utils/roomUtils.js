function getRoomData(controller) { //flag
  return {
    roomId: controller.room.id,
    maxPlayers: controller.room.maxPlayers,
    currentPlayers: controller.room.players.size,
    players: Array.from(controller.room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready || false,
      isHost: p.isHost || false,
    })),
    status: controller.room.status,
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
  cleanupEmptyRoom,
};
