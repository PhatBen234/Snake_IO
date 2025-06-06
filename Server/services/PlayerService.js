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

    // Debug log
    // console.log(
    //   `Checking collision between ${player1.name} and ${player2.name}`
    // );
    // console.log(`Player1 head:`, player1Head);
    // console.log(`Player2 body:`, player2.body);

    // Check if player1's head collides with ANY part of player2's body (including head)
    // Use distance-based collision detection instead of exact coordinate matching
    const collision = player2.body.some((segment) => {
      const dx = Math.abs(segment.x - player1Head.x);
      const dy = Math.abs(segment.y - player1Head.y);
      // Collision if distance is less than or equal to speed (usually 5 pixels)
      return dx <= 5 && dy <= 5;
    });

    if (collision) {
      console.log(
        `🔥 COLLISION DETECTED: ${player1.name} hit ${player2.name}!`
      );
    }

    return collision;
  }

  static resetPlayer(player, startPosition) {
    PlayerController.resetPlayer(player, startPosition);
  }
}

module.exports = PlayerService;
