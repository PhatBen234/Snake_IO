const PlayerService = require("./PlayerService");
const PlayerController = require("../controllers/PlayerController");

class CollisionService {
  static checkAllCollisions(room) {
    const { width, height } = room.config;

    room.players.forEach((player) => {
      if (!player.alive) return;

      if (PlayerService.checkWallCollision(player, width, height)) {
        PlayerController.setPlayerAlive(player, false);
        return;
      }

      if (PlayerService.checkSelfCollision(player)) {
        PlayerController.setPlayerAlive(player, false);
        return;
      }

      room.players.forEach((otherPlayer) => {
        if (PlayerService.checkPlayerCollision(player, otherPlayer)) {
          PlayerController.setPlayerAlive(player, false);
        }
      });
    });
  }
}

module.exports = CollisionService;