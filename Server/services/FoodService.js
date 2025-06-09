const Food = require("../models/Food");
const { v4: uuidv4 } = require("uuid");
const GAME_CONSTANTS = require("../config/constants");

class FoodService {
  static spawnFood(room) {
    while (room.foods.size < GAME_CONSTANTS.FOOD_COUNT) {
      const id = uuidv4();
      const position = this.getRandomPosition(room.config);
      const food = new Food(id, position);
      room.foods.set(food.id, food);
    }
  }

  static getRandomPosition(config) {
    const { width, height } = config;
    const padding = GAME_CONSTANTS.FOOD_SPAWN_PADDING;
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

    return distance < GAME_CONSTANTS.COLLISION_THRESHOLD;
  }

  static consumeFood(player, food) {
    food.alive = false;
    this.growPlayer(player, food.value);
  }

  static growPlayer(player, amount) {
    const PlayerService = require("./PlayerService");
    PlayerService.growPlayer(player, amount);
  }
}

module.exports = FoodService;
