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
}

module.exports = Room;