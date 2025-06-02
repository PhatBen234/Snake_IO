const Food = require("../models/Food");
const { v4: uuidv4 } = require("uuid");

class FoodService {
  static spawnFood(room) {
    while (room.foods.size < room.config.foodCount) {
      const id = uuidv4();
      const position = this.getRandomPosition(room.config);
      const food = new Food(id, position);
      room.addFood(food);
    }
  }

  static getRandomPosition(config) {
    const { width, height } = config;
    return {
      x: Math.floor(Math.random() * (width - 20)) + 10,
      y: Math.floor(Math.random() * (height - 20)) + 10,
    };
  }

  static checkFoodCollision(player, food) {
    if (!food.alive) return false;

    const distance = Math.sqrt(
      Math.pow(player.position.x - food.position.x, 2) +
        Math.pow(player.position.y - food.position.y, 2)
    );

    return distance < 15; // Collision threshold
  }

  static consumeFood(player, food) {
    food.setAlive(false);
    player.grow(food.value);
  }
}

module.exports = FoodService;
