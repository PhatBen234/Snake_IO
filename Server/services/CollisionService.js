const PlayerService = require("./PlayerService");
const PlayerController = require("../controllers/PlayerController");

class CollisionService {
  static checkAllCollisions(room) {
    const { width, height } = room.config;

    room.players.forEach((player) => {
      if (!player.alive) return;

      // Wall collision
      if (PlayerService.checkWallCollision(player, width, height)) {//đụng tường chết
        PlayerController.setPlayerAlive(player, false);
        return;
      }

      // Self collision
      if (PlayerService.checkSelfCollision(player)) {// tự cắn chết
        PlayerController.setPlayerAlive(player, false);
        return;
      }

      // Player vs player collision
      room.players.forEach((otherPlayer) => {
        if (PlayerService.checkPlayerCollision(player, otherPlayer)) {
          PlayerController.setPlayerAlive(player, false);
        }
      });
    });
  }
}

module.exports = CollisionService;
