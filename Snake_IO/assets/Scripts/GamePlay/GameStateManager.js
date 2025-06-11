import { GameConfig } from "./GameConfig";
import { ColorUtils } from "./ColorUtils";

export default class GameStateManager {
  constructor() {
    this.gameState = null;
    this.playerSnakes = new Map();
    this.foodNodes = new Map();
    this.isGameActiveFlag = false;

    // UI References
    this.gameArea = null;
    this.snakePrefab = null;
    this.foodPrefab = null;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.gridSize = 0;
  }

  initialize(config) {
    this.gameArea = config.gameArea;
    this.snakePrefab = config.snakePrefab;
    this.foodPrefab = config.foodPrefab;
    this.canvasWidth = config.canvasWidth;
    this.canvasHeight = config.canvasHeight;
    this.gridSize = config.gridSize;
  }

  setupGameArea() {
    if (!this.gameArea) return;

    this.gameArea.width = this.canvasWidth;
    this.gameArea.height = this.canvasHeight;

    const background = this.gameArea.getComponent(cc.Sprite);
    if (background) {
      background.node.color = cc.Color.BLACK;
    }
  }

  startGame() {
    this.isGameActiveFlag = true;
    this.clearGameObjects();
  }

  endGame() {
    this.isGameActiveFlag = false;
  }

  updateGameState(state) {
    this.gameState = state;
  }

  updatePlayers(players) {
    players.forEach((player) => {
      if (player.alive) {
        this.updatePlayerSnake(player);
      } else {
        this.removePlayer(player.id);
      }
    });
  }

  updatePlayerSnake(player) {
    let snakeNode = this.playerSnakes.get(player.id);

    if (!snakeNode) {
      snakeNode = this.createSnakeNode(player);
      if (snakeNode) {
        this.playerSnakes.set(player.id, snakeNode);
      }
    } else {
      const snakeScript = snakeNode.getComponent("Snake");
      snakeScript?.updateSnake(player);
    }
  }

  createSnakeNode(player) {
    if (!this.snakePrefab) return null;

    const snakeNode = cc.instantiate(this.snakePrefab);
    snakeNode.parent = this.gameArea;

    const snakeScript = snakeNode.getComponent("Snake");
    snakeScript?.initializeSnake(player);

    return snakeNode;
  }

  removePlayer(playerId) {
    const snakeNode = this.playerSnakes.get(playerId);
    if (snakeNode?.isValid) {
      snakeNode.destroy();
      this.playerSnakes.delete(playerId);
    }

    // Update gameState when player quits
    if (this.gameState && this.gameState.players) {
      const playerIndex = this.gameState.players.findIndex(
        (p) => p.id === playerId
      );
      if (playerIndex !== -1) {
        this.gameState.players[playerIndex].score = 0;
        this.gameState.players[playerIndex].alive = false;
      }
    }
  }

  updateFoods(foods) {
    // Remove dead foods
    this.foodNodes.forEach((foodNode, foodId) => {
      const food = foods.find((f) => f.id === foodId);
      if (!food?.alive) {
        const foodScript = foodNode.getComponent("Food");
        foodScript?.onEaten();

        setTimeout(() => {
          if (foodNode?.isValid) {
            foodNode.destroy();
          }
        }, 500);

        this.foodNodes.delete(foodId);
      }
    });

    // Add/update alive foods
    foods.forEach((food) => {
      if (food.alive) {
        this.updateFood(food);
      }
    });
  }

  updateFood(food) {
    let foodNode = this.foodNodes.get(food.id);

    if (!foodNode) {
      foodNode = this.createFoodNode(food);
      if (foodNode) {
        this.foodNodes.set(food.id, foodNode);
      }
    } else {
      const foodScript = foodNode.getComponent("Food");
      foodScript?.updateFood(food);
    }
  }

  createFoodNode(food) {
    if (!this.foodPrefab) return null;

    const foodNode = cc.instantiate(this.foodPrefab);
    foodNode.parent = this.gameArea;
    foodNode.name = `Food_${food.id}`;

    const foodScript = foodNode.getComponent("Food");
    if (foodScript) {
      foodScript.initFood(food.id, food);
    } else {
      // Fallback
      foodNode.color = cc.Color.RED;
      foodNode.width = this.gridSize;
      foodNode.height = this.gridSize;

      const worldPos = this.gridToWorldPosition(food.position);
      foodNode.setPosition(worldPos.x, worldPos.y);
    }

    return foodNode;
  }

  gridToWorldPosition(gridPos) {
    const worldX = gridPos.x - this.canvasWidth / 2;
    const worldY = this.canvasHeight / 2 - gridPos.y;
    return { x: worldX, y: worldY };
  }

  updatePlayersFromScores(scores) {
    if (this.gameState) {
      this.gameState.players = scores.map((scoreData) => ({
        id: scoreData.id,
        name: scoreData.name,
        score: scoreData.score,
        alive: scoreData.status === "alive",
      }));
    }
  }

  clearGameObjects() {
    this.playerSnakes.forEach((snake) => snake?.isValid && snake.destroy());
    this.playerSnakes.clear();

    this.foodNodes.forEach((food) => food?.isValid && food.destroy());
    this.foodNodes.clear();
  }

  // Getters
  isGameActive() {
    return this.isGameActiveFlag;
  }

  hasGameState() {
    return this.gameState !== null;
  }

  hasPlayers() {
    return this.gameState && this.gameState.players;
  }

  getPlayersData() {
    return this.gameState?.players;
  }

  reset() {
    this.gameState = null;
    this.isGameActiveFlag = false;
    this.clearGameObjects();
  }
}
