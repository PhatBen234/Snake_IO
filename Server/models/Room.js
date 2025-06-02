// models/Room.js
class Room {
  constructor(id, maxPlayers = 4) {
    this.id = id;
    this.players = new Map(); // Chỉ lưu data
    this.foods = new Map();

    this.status = "waiting";
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
