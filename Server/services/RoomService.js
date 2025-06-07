class RoomService {
  static isEmpty(room) {
    return room.players.size === 0;
  }

  static isFull(room) {
    return room.players.size >= room.maxPlayers;
  }

  static canStart(room) {
    return room.players.size >= 2 && room.status === "waiting";
  }

  static getActivePlayers(room) {
    return Array.from(room.players.values()).filter((p) => p.alive);
  }

  static getPlayersData(room) {
    return Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      body: p.body,
      score: p.score,
      alive: p.alive,
    }));
  }

  static getFoodsData(room) {
    return Array.from(room.foods.values()).map((f) => ({
      id: f.id,
      position: f.position,
      alive: f.alive,
    }));
  }

  static getRoomData(room) {
    return {
      id: room.id,
      status: room.status,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      config: room.config,
    };
  }

  // Thêm method để validate player limit
  // static isValidPlayerLimit(limit) {
  //   return limit >= 2 && limit <= 4;
  // }

  // // Check xem có thể thay đổi limit không (chỉ khi đang waiting và chưa vượt quá limit mới)
  // static canChangePlayerLimit(room, newLimit) {
  //   return (
  //     room.status === "waiting" && 
  //     room.players.size <= newLimit && 
  //     this.isValidPlayerLimit(newLimit)
  //   );
  // }
}

module.exports = RoomService;