const { ccclass, property } = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
  @property(cc.Prefab)
  snakePrefab = null;

  @property(cc.Prefab)
  foodPrefab = null;

  @property(cc.Node)
  gameArea = null;

  @property(cc.Label)
  scoreLabel = null;

  @property(cc.Label)
  statusLabel = null;

  socket = null;
  playerId = null;
  currentRoom = null;
  gameState = null;

  playerSnakes = new Map();
  foodNodes = new Map();

  canvasWidth = 960;
  canvasHeight = 640;
  gridSize = 20;

  isGameActive = false;
  isInitialized = false;
  quitConfirmTimer = null; // NEW: For quit confirmation

  start() {
    this.resetGameState();
    this.initialize();
  }

  async initialize() {
    try {
      this.setupSocket();
      this.setupGameArea();
      this.setupKeyboardControls();
      this.setupSocketEvents();

      this.isInitialized = true;
      this.updateStatus("Ready - Waiting for game to start...");

      setTimeout(() => this.autoStartGame(), 1000);
    } catch (error) {
      this.updateStatus("Initialization error - Returning to lobby...");
      setTimeout(() => cc.director.loadScene("JoinRoom"), 2000);
    }
  }

  setupSocket() {
    this.socket = window.gameSocket;

    if (!this.socket?.connected) {
      this.updateStatus("Connection error - Returning to lobby...");
      setTimeout(() => cc.director.loadScene("JoinRoom"), 2000);
      throw new Error("No socket connection");
    }

    this.playerId = this.socket.id;
    this.currentRoom = window.currentRoomId;

    if (!this.playerId || !this.currentRoom) {
      throw new Error("Missing player ID or room ID");
    }
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

  setupSocketEvents() {
    // Clear existing listeners
    [
      "game-started",
      "game-state",
      "game-ended",
      "player-joined",
      "player-left",
      "start-game-failed",
      "quit-room-success", // NEW
      "quit-room-failed", // NEW
    ].forEach((event) => this.socket.off(event));

    this.socket.on("game-started", (data) => {
      if (this.isInitialized) {
        this.isGameActive = true;
        this.updateStatus("Game started!");
        this.clearGameObjects();
      }
    });

    this.socket.on("game-state", (state) => {
      if (this.isInitialized && this.isGameActive && state) {
        this.gameState = state;
        this.updateGameDisplay(state);
      }
    });

    this.socket.on("game-ended", (data) => {
      this.isGameActive = false;
      this.handleGameEnd(data);
    });

    this.socket.on("player-left", (data) => {
      this.removePlayerSnake(data.playerId);

      // NEW: Show quit message
      if (data.reason === "quit") {
        this.updateStatus(`${data.playerName} has left the room`);
        setTimeout(() => {
          if (this.isGameActive) {
            this.updateStatus("Game in progress...");
          }
        }, 2000);
      }
    });

    this.socket.on("start-game-failed", (data) => {
      this.updateStatus(`Cannot start game: ${data.reason}`);
    });

    // NEW: Handle quit room responses
    this.socket.on("quit-room-success", (data) => {
      this.updateStatus("Successfully left the room!");
      this.resetGameState();
      window.currentRoomId = null;

      setTimeout(() => {
        cc.director.loadScene("JoinRoom");
      }, 1000);
    });

    this.socket.on("quit-room-failed", (data) => {
      this.updateStatus(`Cannot leave room: ${data.reason}`);
    });
  }

  setupKeyboardControls() {
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
        // Movement controls
        if (this.canProcessInput()) {
          const direction = this.getDirectionFromKey(event.keyCode);
          if (direction) {
            this.sendPlayerMove(direction);
          }
        }

        // NEW: Quit room with ESC key
        if (event.keyCode === cc.macro.KEY.escape) {
          this.quitRoom();
        }
      },
      this
    );
  }

  canProcessInput() {
    return (
      this.isInitialized &&
      this.isGameActive &&
      this.currentRoom &&
      this.gameState
    );
  }

  getDirectionFromKey(keyCode) {
    const directions = {
      [cc.macro.KEY.up]: { x: 0, y: -1 },
      [cc.macro.KEY.w]: { x: 0, y: -1 },
      [cc.macro.KEY.down]: { x: 0, y: 1 },
      [cc.macro.KEY.s]: { x: 0, y: 1 },
      [cc.macro.KEY.left]: { x: -1, y: 0 },
      [cc.macro.KEY.a]: { x: -1, y: 0 },
      [cc.macro.KEY.right]: { x: 1, y: 0 },
      [cc.macro.KEY.d]: { x: 1, y: 0 },
    };
    return directions[keyCode];
  }

  // NEW: Quit room method
  quitRoom() {
    if (!this.socket || !this.currentRoom || !this.playerId) {
      this.updateStatus("Cannot leave room - missing information!");
      return;
    }

    // Confirm quit if currently playing game
    if (this.isGameActive) {
      if (!this.quitConfirmTimer) {
        this.updateStatus(
          "Press ESC again to confirm quit (you will lose points)"
        );

        this.quitConfirmTimer = setTimeout(() => {
          this.quitConfirmTimer = null;
          if (this.statusLabel && this.statusLabel.string.includes("confirm")) {
            this.updateStatus("Game in progress...");
          }
        }, 3000);
        return;
      } else {
        // Double ESC press confirmed
        clearTimeout(this.quitConfirmTimer);
        this.quitConfirmTimer = null;
      }
    }

    this.updateStatus("Leaving room...");

    this.socket.emit("quit-room", {
      roomId: this.currentRoom,
      playerId: this.playerId,
    });
  }

  autoStartGame() {
    if (this.isInitialized && this.currentRoom && this.socket) {
      this.socket.emit("start-game", {
        roomId: this.currentRoom,
        playerId: this.playerId,
      });
    }
  }

  updateGameDisplay(state) {
    if (state.players) {
      this.updatePlayers(state.players);
    }

    if (state.foods) {
      this.updateFoods(state.foods);
    }

    const myPlayer = state.players?.find((p) => p.id === this.playerId);
    if (myPlayer) {
      this.updateScore(myPlayer.score);
      if (!myPlayer.alive) {
        this.updateStatus("You died!");
      }
    }
  }

  updatePlayers(players) {
    players.forEach((player) => {
      if (player.alive) {
        this.updatePlayerSnake(player);
      } else {
        this.removePlayerSnake(player.id);
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

  removePlayerSnake(playerId) {
    const snakeNode = this.playerSnakes.get(playerId);
    if (snakeNode?.isValid) {
      snakeNode.destroy();
      this.playerSnakes.delete(playerId);
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

  sendPlayerMove(direction) {
    if (this.canProcessInput()) {
      this.socket.emit("player-move", {
        roomId: this.currentRoom,
        playerId: this.playerId,
        direction: direction,
      });
    }
  }

  updateScore(score) {
    if (this.scoreLabel) {
      this.scoreLabel.string = `Score: ${score}`;
    }
  }

  updateStatus(status) {
    if (this.statusLabel) {
      this.statusLabel.string = status;
    }
  }

  handleGameEnd(data) {
    this.isGameActive = false;
    this.updateStatus(
      `Game ended! ${data.winner ? `Winner: ${data.winner}` : "Draw"}`
    );

    // Log scores of all players
    if (this.gameState && this.gameState.players) {
      console.log("=== GAME RESULTS ===");
      this.gameState.players.forEach((player, index) => {
        console.log(
          `Player ${index + 1} (ID: ${player.id}): ${player.score} points`
        );
      });
      console.log("==================");
    }

    setTimeout(() => this.clearGameObjects(), 1500);
    setTimeout(() => this.showGameEndOptions(), 4000);
  }

  showGameEndOptions() {
    this.resetGameState();
    window.currentRoomId = null;
    cc.director.loadScene("JoinRoom");
  }

  getPlayerColor(playerId, isHead = true) {
    const colors = [
      cc.Color.GREEN,
      cc.Color.BLUE,
      cc.Color.YELLOW,
      cc.Color.MAGENTA,
    ];
    const hash = this.hashString(playerId);
    const baseColor = colors[Math.abs(hash) % colors.length];

    return isHead
      ? baseColor
      : new cc.Color(baseColor.r * 0.7, baseColor.g * 0.7, baseColor.b * 0.7);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  clearGameObjects() {
    this.playerSnakes.forEach((snake) => snake?.isValid && snake.destroy());
    this.playerSnakes.clear();

    this.foodNodes.forEach((food) => food?.isValid && food.destroy());
    this.foodNodes.clear();
  }

  resetGameState() {
    this.gameState = null;
    this.isGameActive = false;
    this.isInitialized = false;
    this.clearGameObjects();

    if (this.scoreLabel) {
      this.scoreLabel.string = "Score: 0";
    }

    // NEW: Clear quit confirmation timer
    if (this.quitConfirmTimer) {
      clearTimeout(this.quitConfirmTimer);
      this.quitConfirmTimer = null;
    }
  }

  onDestroy() {
    this.isGameActive = false;
    this.isInitialized = false;
    this.clearGameObjects();

    // NEW: Clear quit confirmation timer
    if (this.quitConfirmTimer) {
      clearTimeout(this.quitConfirmTimer);
      this.quitConfirmTimer = null;
    }

    if (this.socket) {
      [
        "game-started",
        "game-state",
        "game-ended",
        "player-joined",
        "player-left",
        "start-game-failed",
        "quit-room-success", // NEW
        "quit-room-failed", // NEW
      ].forEach((event) => this.socket.off(event));
    }

    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }
}
