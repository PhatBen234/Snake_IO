class Room {
  constructor(id, maxPlayers = 4) {
    this.id = id;
    this.players = new Map();
    this.foods = new Map();
    this.status = "waiting"; // waiting, playing, finished
    this.maxPlayers = maxPlayers;
    this.config = {
      width: 800,
      height: 600,
      speed: 5,
      foodCount: 10,
    };
    this.createdAt = Date.now();
  }

  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) return false;
    this.players.set(player.id, player);
    return true;
  }

  removePlayer(playerId) {
    return this.players.delete(playerId);
  }

  addFood(food) {
    this.foods.set(food.id, food);
  }

  removeFood(foodId) {
    return this.foods.delete(foodId);
  }

  setStatus(status) {
    this.status = status;
  }

  reset() {
    this.status = "waiting";
    this.players.clear();
    this.foods.clear();
    this.createdAt = Date.now();
  }
}

module.exports = Room;
