const Food = require("../models/Food");
const PlayerController = require("../controllers/PlayerController");
const { v4: uuidv4 } = require("uuid");

class FoodService {
  static spawnFood(room) {
    while (room.foods.size < room.config.foodCount) {
      const id = uuidv4();
      const position = this.getRandomPosition(room.config);
      const food = new Food(id, position);
      room.foods.set(food.id, food);
    }
  }

  static getRandomPosition(config) {
    const { width, height } = config;
    const padding = 100; // Tăng từ 20 lên 100 để thu hẹp vùng spawn
    const x = Math.floor(Math.random() * (width - padding * 2)) + padding;
    const y = Math.floor(Math.random() * (height - padding * 2)) + padding;
    return { x, y };
  }

  static checkFoodCollision(player, food) {
    if (!food.alive || !player.body || player.body.length === 0) return false;

    const headPosition = player.body[0];
    const distance = Math.sqrt(
      Math.pow(headPosition.x - food.position.x, 2) +
        Math.pow(headPosition.y - food.position.y, 2)
    );

    const collisionThreshold = 15;
    return distance < collisionThreshold;
  }

  static consumeFood(player, food) {
    PlayerController.setFoodAlive(food, false);
    PlayerController.growPlayer(player, food.value);
  }
}

module.exports = FoodService;
