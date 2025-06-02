const Player = require("../models/Player");
const Food = require("../models/Food");
const { v4: uuidv4 } = require("uuid");

class GameService {
  constructor(room) {
    this.room = room;
  }

  movePlayer(playerId) {
    const player = this.room.players.get(playerId);
    if (!player || !player.alive) return;

    const newHead = {
      x: player.position.x + player.direction.x * player.speed,
      y: player.position.y + player.direction.y * player.speed,
    };

    player.position = newHead;
    player.body.unshift(newHead);

    if (player.body.length > player.length) {
      player.body.pop();
    }
  }

  changeDirection(playerId, newDirection) {
    const player = this.room.players.get(playerId);
    if (!player) return;

    // TODO: kiểm tra newDirection hợp lệ (vd: không ngược chiều)
    player.setDirection(newDirection);
  }

  playerEatFood(playerId, foodId) {
    const player = this.room.players.get(playerId);
    const food = this.room.foods.get(foodId);
    if (!player || !food || !food.alive) return;

    food.setAlive(false);
    player.grow(1);
  }

  spawnFood() {
    while (this.room.foods.size < this.room.config.foodCount) {
      const id = uuidv4();
      const position = this.randomPosition();
      const food = new Food(id, position);
      this.room.addFood(food);
    }
  }

  randomPosition() {
    const { width, height } = this.room.config;
    return {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
    };
  }

  checkCollisions() {
    // Kiểm tra player va chạm, rắn tự cắn mình, ăn food, chạm tường...
    // Cập nhật trạng thái player.alive, điểm,...
  }

  resetGame() {
    this.room.reset();
    this.spawnFood();
  }
}

module.exports = GameService;
