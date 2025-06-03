const Player = require("../models/Player");

class PlayerController {
  // Logic từ Player.setDirection
  static setPlayerDirection(player, newDirection) {
    player.direction = newDirection;
  }

  // Logic từ Player.grow
  static growPlayer(player, amount = 1) {
    player.length += amount;
    player.score += amount;
  }

  // Logic từ Player.reset
  static resetPlayer(player, startPosition = { x: 0, y: 0 }) {
    player.position = startPosition;
    player.body = [{ ...startPosition }];
    player.length = 1;
    player.alive = true;
    player.score = 0;
    player.direction = { x: 1, y: 0 };
  }

  // Logic từ Player.setAlive
  static setPlayerAlive(player, alive) {
    player.alive = alive;
  }

  // Logic từ Food.setAlive (nếu cần)
  static setFoodAlive(food, alive) {
    food.alive = alive;
  }
}

module.exports = PlayerController;