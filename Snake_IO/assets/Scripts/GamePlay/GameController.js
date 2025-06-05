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

  // Game objects
  playerSnakes = new Map();
  foodNodes = new Map();

  // Game settings
  gameAreaWidth = 960;
  gameAreaHeight = 640;
  gridSize = 20;

  // FIXED: Add game status flag
  isGameActive = false;

  start() {
    console.log("🎮 Starting Game Controller");

    // FIXED: Reset game state khi start
    this.resetGameState();

    // FIXED: Đảm bảo socket connection được preserve
    this.socket = window.gameSocket;

    if (!this.socket || !this.socket.connected) {
      console.error("❌ No valid socket connection found!");
      this.updateStatus("Lỗi kết nối - Quay về lobby...");
      setTimeout(() => {
        cc.director.loadScene("LobbyScene");
      }, 2000);
      return;
    }

    this.playerId = this.socket.id;
    this.currentRoom = window.currentRoomId;

    console.log("🔗 Socket connected:", this.socket.connected);
    console.log("👤 Player ID:", this.playerId);
    console.log("🏠 Room ID:", this.currentRoom);

    this.setupSocketEvents();
    this.setupKeyboardControls();
    this.initializeGame();

    // Đặt status ban đầu
    this.updateStatus("Đã sẵn sàng - Chờ bắt đầu game...");

    // FIXED: Auto-start game nếu là host (tạm thời để test)
    setTimeout(() => {
      this.autoStartGame();
    }, 1000);
  }

  // FIXED: Reset game state method
  resetGameState() {
    console.log("🔄 Resetting game state...");

    this.gameState = null;
    this.isGameActive = false;

    // Clear existing game objects
    this.clearGameObjects();

    // Reset score
    if (this.scoreLabel) {
      this.scoreLabel.string = "Score: 0";
    }
  }

  // FIXED: Thêm function auto start để test
  autoStartGame() {
    if (!this.currentRoom || !this.socket) return;

    console.log("🚀 Auto starting game...");
    this.socket.emit("start-game", {
      roomId: this.currentRoom,
      playerId: this.playerId,
    });
  }

  setupSocketEvents() {
    console.log("📡 Setting up socket events...");

    // FIXED: Clear existing listeners trước
    this.socket.off("game-started");
    this.socket.off("game-state");
    this.socket.off("game-ended");
    this.socket.off("player-joined");
    this.socket.off("player-left");

    // Game bắt đầu
    this.socket.on("game-started", (data) => {
      console.log("🚀 Game Started Event Received!", data);
      this.isGameActive = true; // FIXED: Set game active
      this.updateStatus("Game đã bắt đầu!");
      this.startGameLoop();
    });

    // Cập nhật trạng thái game
    this.socket.on("game-state", (state) => {
      console.log("🎯 Game State Update:", state);

      // FIXED: Only update if game is active
      if (this.isGameActive) {
        this.gameState = state;
        this.updateGameDisplay(state);
      }
    });

    // Game kết thúc
    this.socket.on("game-ended", (data) => {
      console.log("🏁 Game Ended:", data);
      this.isGameActive = false; // FIXED: Set game inactive
      this.handleGameEnd(data);
    });

    // Player events
    this.socket.on("player-joined", (data) => {
      console.log("👥 Player joined:", data);
    });

    this.socket.on("player-left", (data) => {
      console.log("👋 Player left:", data);
      this.removePlayerSnake(data.playerId);
    });

    // Start game failed
    this.socket.on("start-game-failed", (data) => {
      console.log("❌ Start game failed:", data);
      this.updateStatus(`Không thể bắt đầu: ${data.reason}`);
    });

    // Disconnect
    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
      this.updateStatus("Mất kết nối server");
    });

    console.log("✅ Socket events setup complete");
  }

  setupKeyboardControls() {
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
        // FIXED: Only allow input when game is active
        if (!this.currentRoom || !this.gameState || !this.isGameActive) return;

        let direction = null;

        switch (event.keyCode) {
          case cc.macro.KEY.up:
          case cc.macro.KEY.w:
            direction = { x: 0, y: -1 };
            break;
          case cc.macro.KEY.down:
          case cc.macro.KEY.s:
            direction = { x: 0, y: 1 };
            break;
          case cc.macro.KEY.left:
          case cc.macro.KEY.a:
            direction = { x: -1, y: 0 };
            break;
          case cc.macro.KEY.right:
          case cc.macro.KEY.d:
            direction = { x: 1, y: 0 };
            break;
        }

        if (direction) {
          this.sendPlayerMove(direction);
        }
      },
      this
    );
  }

  initializeGame() {
    console.log("🎮 Initializing game...");

    // Clear existing game objects
    this.clearGameObjects();

    // Setup game area
    this.setupGameArea();

    console.log("✅ Game initialized for room:", this.currentRoom);
  }

  // FIXED: Thêm function để start game loop
  startGameLoop() {
    console.log("🔄 Starting game loop...");
    // FIXED: Clear any existing game objects when starting new game
    this.clearGameObjects();
  }

  setupGameArea() {
    if (!this.gameArea) return;

    // Set game area size - sẽ dùng giá trị mới 960x640
    this.gameArea.width = this.gameAreaWidth;
    this.gameArea.height = this.gameAreaHeight;

    // Set background color
    const background = this.gameArea.getComponent(cc.Sprite);
    if (background) {
      background.node.color = cc.Color.BLACK;
    }
  }

  updateGameDisplay(state) {
    if (!state || !this.isGameActive) return; // FIXED: Check if game is active

    console.log("🔄 Updating game display...");

    // Update players
    if (state.players) {
      this.updatePlayers(state.players);
    }

    // Update foods
    if (state.foods) {
      this.updateFoods(state.foods);
    }

    // Update score cho player hiện tại
    const myPlayer = state.players?.find((p) => p.id === this.playerId);
    if (myPlayer) {
      this.updateScore(myPlayer.score);

      if (!myPlayer.alive) {
        this.updateStatus("Bạn đã chết!");
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
      this.playerSnakes.set(player.id, snakeNode);
    } else {
      const snakeScript = snakeNode.getComponent("Snake");
      snakeScript.updateSnake(player);
    }
  }

  createSnakeNode(player) {
    const snakeNode = cc.instantiate(this.snakePrefab);
    snakeNode.parent = this.gameArea;

    const snakeScript = snakeNode.getComponent("Snake");
    snakeScript.initializeSnake(player);

    return snakeNode;
  }

  updateSnakePosition(snakeNode, player) {
    // Remove old segments
    snakeNode.removeAllChildren();

    // Create new segments
    player.body.forEach((segment, index) => {
      const segmentNode = new cc.Node(`Segment_${index}`);
      segmentNode.parent = snakeNode;

      // Add sprite component
      const sprite = segmentNode.addComponent(cc.Sprite);

      // Set color
      const color =
        index === 0
          ? this.getPlayerHeadColor(player.id)
          : this.getPlayerBodyColor(player.id);
      segmentNode.color = color;

      // Set size
      segmentNode.width = this.gridSize;
      segmentNode.height = this.gridSize;

      // Set position
      segmentNode.setPosition(segment.x, segment.y);
    });
  }

  removePlayerSnake(playerId) {
    const snakeNode = this.playerSnakes.get(playerId);
    if (snakeNode) {
      snakeNode.destroy();
      this.playerSnakes.delete(playerId);
    }
  }

  // FIXED: Sử dụng food prefab thay vì tạo thủ công
  updateFoods(foods) {
    console.log("🍎 Updating foods:", foods);

    // Remove dead foods
    this.foodNodes.forEach((foodNode, foodId) => {
      const food = foods.find((f) => f.id === foodId);
      if (!food || !food.alive) {
        console.log(`🗑️ Removing dead food: ${foodId}`);
        const foodScript = foodNode.getComponent("Food");
        if (foodScript) {
          foodScript.onEaten(); // Trigger eat effect
        }

        // Delay destroy để effect chạy xong
        setTimeout(() => {
          if (foodNode && foodNode.isValid) {
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

  // FIXED: Sử dụng food prefab và component
  updateFood(food) {
    let foodNode = this.foodNodes.get(food.id);

    if (!foodNode) {
      // Tạo food từ prefab
      foodNode = this.createFoodNode(food);
      this.foodNodes.set(food.id, foodNode);
    } else {
      // Update existing food
      const foodScript = foodNode.getComponent("Food");
      if (foodScript) {
        foodScript.updateFood(food);
      }
    }
  }

  // FIXED: Tạo food từ prefab với position system thống nhất
  createFoodNode(food) {
    if (!this.foodPrefab) {
      console.error("❌ Food prefab not assigned!");
      return null;
    }

    console.log(`🍎 Creating food node for ID: ${food.id}`, food);

    // Instantiate từ prefab
    const foodNode = cc.instantiate(this.foodPrefab);
    foodNode.parent = this.gameArea;
    foodNode.name = `Food_${food.id}`;

    // Get Food component và initialize
    const foodScript = foodNode.getComponent("Food");
    if (foodScript) {
      // Food component sẽ tự handle position conversion
      foodScript.initFood(food.id, food);
    } else {
      console.error("❌ Food component not found on prefab!");

      // Fallback: tạo food đơn giản với unified position
      foodNode.color = cc.Color.RED;
      foodNode.width = this.gridSize;
      foodNode.height = this.gridSize;

      // Sử dụng cùng logic position như Snake
      const worldPos = this.unifiedServerToWorld(food.position);
      foodNode.setPosition(worldPos.x, worldPos.y);
    }

    return foodNode;
  }

  unifiedServerToWorld(serverPos) {
    // Logic GIỐNG HỆT như Snake.gridToWorldPosition()
    const canvasWidth = 960;
    const canvasHeight = 640;

    const worldX = serverPos.x - canvasWidth / 2;
    const worldY = canvasHeight / 2 - serverPos.y; // Flip Y axis

    console.log(
      `🔄 Unified Server(${serverPos.x}, ${serverPos.y}) -> World(${worldX}, ${worldY})`
    );
    return { x: worldX, y: worldY };
  }

  sendPlayerMove(direction) {
    if (!this.currentRoom || !this.isGameActive) return; // FIXED: Check if game is active

    console.log("🎮 Sending move:", direction);
    this.socket.emit("player-move", {
      roomId: this.currentRoom,
      playerId: this.playerId,
      direction: direction,
    });
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
    console.log("📢 Status:", status);
  }

  handleGameEnd(data) {
    // FIXED: Set game inactive and clear state
    this.isGameActive = false;

    this.updateStatus(
      `Game kết thúc! ${data.winner ? `Người thắng: ${data.winner}` : "Hòa"}`
    );

    // FIXED: Clear game objects immediately when game ends
    setTimeout(() => {
      this.clearGameObjects();
    }, 1000);

    // Show game end UI after delay
    setTimeout(() => {
      this.showGameEndOptions();
    }, 3000);
  }

  showGameEndOptions() {
    // FIXED: Reset window.currentRoomId before loading lobby
    window.currentRoomId = null;

    // Load về lobby scene hoặc show retry options
    cc.director.loadScene("LobbyScene");
  }

  getPlayerHeadColor(playerId) {
    // Màu head dựa trên player ID
    const colors = [
      cc.Color.GREEN,
      cc.Color.BLUE,
      cc.Color.YELLOW,
      cc.Color.MAGENTA,
    ];
    const hash = this.hashCode(playerId);
    return colors[Math.abs(hash) % colors.length];
  }

  getPlayerBodyColor(playerId) {
    // Màu body nhạt hơn head
    const headColor = this.getPlayerHeadColor(playerId);
    return new cc.Color(
      headColor.r * 0.7,
      headColor.g * 0.7,
      headColor.b * 0.7
    );
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  clearGameObjects() {
    console.log("🧹 Clearing all game objects...");

    // Clear all snakes
    this.playerSnakes.forEach((snake) => {
      if (snake && snake.isValid) {
        snake.destroy();
      }
    });
    this.playerSnakes.clear();

    // Clear all foods
    this.foodNodes.forEach((food) => {
      if (food && food.isValid) {
        food.destroy();
      }
    });
    this.foodNodes.clear();
  }

  onDestroy() {
    console.log("🧹 Cleaning up GameController...");

    // FIXED: Set game inactive
    this.isGameActive = false;

    // Clean up
    this.clearGameObjects();

    // FIXED: Only remove listeners, don't disconnect socket
    if (this.socket) {
      this.socket.off("game-started");
      this.socket.off("game-state");
      this.socket.off("game-ended");
      this.socket.off("player-joined");
      this.socket.off("player-left");
      this.socket.off("start-game-failed");
      // DON'T disconnect socket here - leave it for other scenes
    }

    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }
}
