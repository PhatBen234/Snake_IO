const PlayerService = require("./PlayerService");
const PlayerController = require("../controllers/PlayerController");

class CollisionService {
  static checkAllCollisions(room) {
    const { width, height } = room.config;

    room.players.forEach((player) => {
      if (!player.alive) return;

      // Wall collision
      if (PlayerService.checkWallCollision(player, width, height)) {
        PlayerController.setPlayerAlive(player, false);
        return;
      }

      // Self collision
      if (PlayerService.checkSelfCollision(player)) {
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
// const PlayerService = require("./PlayerService");
// const PlayerController = require("../controllers/PlayerController");

// class CollisionService {
//   static checkAllCollisions(room) {
//     const { width, height } = room.config;

//     // Lọc ra những player còn sống
//     const alivePlayers = room.players.filter((player) => player.alive);

//     alivePlayers.forEach((player) => {
//       // Đồng bộ position trước khi check collision
//       PlayerService.syncPlayerPosition(player);

//       // Wall collision
//       if (PlayerService.checkWallCollision(player, width, height)) {
//         console.log(
//           `Player ${player.id} hit wall at position:`,
//           player.position
//         );
//         PlayerController.setPlayerAlive(player, false);
//         return;
//       }

//       // Self collision - chỉ check nếu body đủ dài
//       if (player.body.length > 4 && PlayerService.checkSelfCollision(player)) {
//         console.log(`Player ${player.id} hit self`);
//         PlayerController.setPlayerAlive(player, false);
//         return;
//       }

//       // Player vs player collision
//       alivePlayers.forEach((otherPlayer) => {
//         // Đảm bảo không check với chính mình
//         if (player.id !== otherPlayer.id) {
//           if (PlayerService.checkPlayerCollision(player, otherPlayer)) {
//             console.log(`Player ${player.id} hit player ${otherPlayer.id}`);
//             PlayerController.setPlayerAlive(player, false);
//           }
//         }
//       });
//     });
//   }

//   // Method debug để kiểm tra collision
//   static debugCollision(room) {
//     console.log("=== COLLISION DEBUG ===");
//     room.players.forEach((player) => {
//       if (player.alive) {
//         console.log(`Player ${player.id}:`, {
//           head: player.body[0],
//           bodyLength: player.body.length,
//           alive: player.alive,
//         });
//       }
//     });
//     console.log("======================");
//   }
// }

// module.exports = CollisionService;
