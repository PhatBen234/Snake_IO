const GAME_CONSTANTS = require("../config/constants");

class PlayerService {
  static movePlayer(player) {
    if (!player.alive) return;

    const newHead = {
      x: player.position.x + player.direction.x * GAME_CONSTANTS.PLAYER_SPEED,
      y: player.position.y + player.direction.y * GAME_CONSTANTS.PLAYER_SPEED,
    };

    player.position = newHead;
    player.body.unshift(newHead);

    if (player.body.length > player.length) {
      player.body.pop();
    }
  }

  static validateDirection(player, newDirection) {
    return !(
      player.direction.x + newDirection.x === 0 &&
      player.direction.y + newDirection.y === 0
    );
  }

  static changeDirection(player, newDirection) {
    if (this.validateDirection(player, newDirection)) {
      player.direction = newDirection;
      return true;
    }
    return false;
  }

  static checkSelfCollision(player) {
    const head = player.body[0];
    return player.body
      .slice(1)
      .some((segment) => segment.x === head.x && segment.y === head.y);
  }

  static checkWallCollision(player, width, height) {
    return (
      player.position.x < 0 ||
      player.position.x >= width ||
      player.position.y < 0 ||
      player.position.y >= height
    );
  }

  static checkPlayerCollision(player1, player2) {
    if (player1.id === player2.id || !player2.alive) return false;

    const player1Head = player1.body[0];
    if (!player1Head) return false;

    const collision = player2.body.some((segment) => {
      const dx = Math.abs(segment.x - player1Head.x);
      const dy = Math.abs(segment.y - player1Head.y);
      return (
        dx <= GAME_CONSTANTS.COLLISION_THRESHOLD &&
        dy <= GAME_CONSTANTS.COLLISION_THRESHOLD
      );
    });

    return collision;
  }

  static growPlayer(player, amount = GAME_CONSTANTS.FOOD_VALUE) {
    player.length += amount;
    player.score += amount;
  }

  static setPlayerAlive(player, alive) {
    player.alive = alive;
  }

  static resetPlayer(player, startPosition = { x: 0, y: 0 }) {
    player.position = startPosition;
    player.body = [{ ...startPosition }];
    player.length = 1;
    player.alive = true;
    player.score = 0;
    player.direction = { x: 1, y: 0 };
  }
}

module.exports = PlayerService;