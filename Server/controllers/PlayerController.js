const Player = require("../models/Player");

class PlayerController {
  static setPlayerDirection(player, newDirection) {
    player.direction = newDirection;
  }

  static growPlayer(player, amount = 1) {
    player.length += amount;
    player.score += amount;
  }

  static resetPlayer(player, startPosition = { x: 0, y: 0 }) {
    player.position = startPosition;
    player.body = [{ ...startPosition }];
    player.length = 1;
    player.alive = true;
    player.score = 0;
    player.direction = { x: 1, y: 0 };
  }

  static setPlayerAlive(player, alive) {
    player.alive = alive;
  }

  static setFoodAlive(food, alive) {
    food.alive = alive;
  }
}

module.exports = PlayerController;