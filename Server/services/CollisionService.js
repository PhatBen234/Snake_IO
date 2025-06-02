const PlayerService = require("./PlayerService");

class CollisionService {
  static checkAllCollisions(room) {
    const { width, height } = room.config;

    room.players.forEach((player) => {
      if (!player.alive) return;

      // Wall collision
      if (PlayerService.checkWallCollision(player, width, height)) {
        player.setAlive(false);
        return;
      }

      // Self collision
      if (PlayerService.checkSelfCollision(player)) {
        player.setAlive(false);
        return;
      }

      // Player vs player collision
      room.players.forEach((otherPlayer) => {
        if (PlayerService.checkPlayerCollision(player, otherPlayer)) {
          player.setAlive(false);
        }
      });
    });
  }
}

module.exports = CollisionService;
