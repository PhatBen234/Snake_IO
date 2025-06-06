const PlayerController = require("../controllers/PlayerController");

class PlayerService {
  static movePlayer(player) {
    if (!player.alive) return;

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

  static validateDirection(player, newDirection) {
    // Prevent reverse direction
    return !(
      player.direction.x + newDirection.x === 0 &&
      player.direction.y + newDirection.y === 0
    );
  }

  static changeDirection(player, newDirection) {
    if (this.validateDirection(player, newDirection)) {
      PlayerController.setPlayerDirection(player, newDirection);
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

    // Use the actual head position from body array instead of position property
    const player1Head = player1.body[0];
    if (!player1Head) return false;

    // Check if player1's head collides with any part of player2's body
    return player2.body.some(
      (segment) =>
        segment.x === player1Head.x && segment.y === player1Head.y
    );
  }

  static resetPlayer(player, startPosition) {
    PlayerController.resetPlayer(player, startPosition);
  }
}

module.exports = PlayerService;