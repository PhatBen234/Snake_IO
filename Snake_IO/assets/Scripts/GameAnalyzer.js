const { ccclass, property } = cc._decorator;

@ccclass
export default class GameAnalyzer extends cc.Component {
  playerId = null;
  gameState = null;

  init(playerId) {
    this.playerId = playerId;
  }

  analyzeGameState(state) {
    this.gameState = state;
    if (!state.players) return;

    const myPlayer = state.players.find((p) => p.id === this.playerId);
    if (!myPlayer) return;

    this.logPlayerStatus(myPlayer);

    if (state.foods && state.foods.length > 0) {
      const nearbyFood = this.findNearbyFood(myPlayer.position, state.foods);
      if (nearbyFood.length > 0) {
        console.log(`🍎 Nearby food:`, nearbyFood);
      }
    }

    if (!myPlayer.alive) {
      console.log("💥 Player died!");
      this.analyzeDeathCause(myPlayer, state);
    }
  }

  logPlayerStatus(player) {
    console.log(`🐍 Player Status:`, {
      position: player.position,
      score: player.score,
      alive: player.alive,
      bodyLength: player.body.length,
    });
  }

  findNearbyFood(playerPos, foods) {
    return foods.filter((food) => {
      if (!food.alive) return false;

      const distance = Math.sqrt(
        Math.pow(playerPos.x - food.position.x, 2) +
          Math.pow(playerPos.y - food.position.y, 2)
      );

      return distance < 50;
    });
  }

  findNearestFood(playerPos, foods) {
    const aliveFoods = foods.filter((f) => f.alive);
    if (aliveFoods.length === 0) return null;

    return aliveFoods.reduce((nearest, food) => {
      const distToFood = Math.sqrt(
        Math.pow(playerPos.x - food.position.x, 2) +
          Math.pow(playerPos.y - food.position.y, 2)
      );

      const distToNearest = nearest
        ? Math.sqrt(
            Math.pow(playerPos.x - nearest.position.x, 2) +
              Math.pow(playerPos.y - nearest.position.y, 2)
          )
        : Infinity;

      return distToFood < distToNearest ? food : nearest;
    }, null);
  }

  analyzeDeathCause(player, gameState) {
    const pos = player.position;
    const { width, height } = { width: 800, height: 600 };

    if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) {
      console.log("💥 Death cause: Wall collision");
      return;
    }

    const head = player.body[0];
    const selfCollision = player.body
      .slice(1)
      .some((segment) => segment.x === head.x && segment.y === head.y);

    if (selfCollision) {
      console.log("💥 Death cause: Self collision");
      return;
    }

    const otherPlayers = gameState.players.filter(
      (p) => p.id !== player.id && p.alive
    );
    for (let otherPlayer of otherPlayers) {
      const collision = otherPlayer.body.some(
        (segment) => segment.x === pos.x && segment.y === pos.y
      );

      if (collision) {
        console.log(`💥 Death cause: Collision with player ${otherPlayer.id}`);
        return;
      }
    }

    console.log("💥 Death cause: Unknown");
  }

  logCurrentState() {
    console.log("📊 Current Game State:", this.gameState);
  }
}