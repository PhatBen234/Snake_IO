class RoomController {
  constructor(room) {
    this.room = room;
  }

  addPlayer(player) {
    if (this.room.players.size >= this.room.maxPlayers) return false;
    this.room.players.set(player.id, player);
    return true;
  }

  removePlayer(playerId) {
    this.room.players.delete(playerId);
  }

  addFood(food) {
    this.room.foods.set(food.id, food);
  }

  removeFood(foodId) {
    this.room.foods.delete(foodId);
  }

  resetRoom() {
    this.room.status = "waiting";
    this.room.players.clear();
    this.room.foods.clear();
    this.room.createdAt = Date.now();
  }

  getRoomData() {
    return this.room;
  }
}
module.exports = RoomController;
