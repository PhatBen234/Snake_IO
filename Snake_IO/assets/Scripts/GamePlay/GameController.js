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
  gameAreaWidth = 800;
  gameAreaHeight = 600;
  gridSize = 20;

  // FIXED: Thêm flag để track game status
  isGameActive = false;
  keyboardEnabled = false;

  start() {
    console.log("🎮 Starting Game Controller");

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
    this.initializeGame();

    // Đặt status ban đầu
    this.updateStatus("Đã sẵn sàng - Chờ bắt đầu game...");

    // FIXED: Auto-start game với delay ngắn hơn
    setTimeout(() => {
      this.autoStartGame();
    }, 500);
  }

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
      this.isGameActive = true;
      this.updateStatus("Game đã bắt đầu!");
      this.startGameLoop();

      // FIXED: Enable keyboard sau khi game bắt đầu
      setTimeout(() => {
        this.keyboardEnabled = true;
        this.setupKeyboardControls();
        console.log("⌨️ Keyboard controls enabled");
      }, 1000);
    });

    // Cập nhật trạng thái game
    this.socket.on("game-state", (state) => {
      console.log("🎯 Game State Update:", state);
      this.gameState = state;
      this.updateGameDisplay(state);
    });

    // Game kết thúc
    this.socket.on("game-ended", (data) => {
      console.log("🏁 Game Ended:", data);
      this.isGameActive = false;
      this.keyboardEnabled = false;
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
      this.isGameActive = false;
      this.keyboardEnabled = false;
      this.updateStatus("Mất kết nối server");
    });

    console.log("✅ Socket events setup complete");
  }

  setupKeyboardControls() {
    // FIXED: Chỉ setup keyboard controls một lần
    if (this.keyboardSetup) return;
    this.keyboardSetup = true;

    console.log("⌨️ Setting up keyboard controls...");

    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
        // FIXED: Kiểm tra game state trước khi xử lý input
        if (
          !this.keyboardEnabled ||
          !this.isGameActive ||
          !this.currentRoom ||
          !this.gameState
        ) {
          console.log("🚫 Input blocked - Game not active or not ready");
          return;
        }

        let direction = null;
        let keyName = "";

        switch (event.keyCode) {
          case cc.macro.KEY.up:
            direction = { x: 0, y: 1 };
            keyName = "UP";
            break;
          case cc.macro.KEY.w:
            direction = { x: 0, y: 1 };
            keyName = "W";
            break;
          case cc.macro.KEY.down:
            direction = { x: 0, y: -1 };
            keyName = "DOWN";
            break;
          case cc.macro.KEY.s:
            direction = { x: 0, y: -1 };
            keyName = "S";
            break;
          case cc.macro.KEY.left:
            direction = { x: -1, y: 0 };
            keyName = "LEFT";
            break;
          case cc.macro.KEY.a:
            direction = { x: -1, y: 0 };
            keyName = "A";
            break;
          case cc.macro.KEY.right:
            direction = { x: 1, y: 0 };
            keyName = "RIGHT";
            break;
          case cc.macro.KEY.d:
            direction = { x: 1, y: 0 };
            keyName = "D";
            break;
        }

        if (direction) {
          console.log(`🎮 Key pressed: ${keyName}, Direction:`, direction);
          this.sendPlayerMove(direction);
        }
      },
      this
    );

    console.log("✅ Keyboard controls setup complete");
  }

  initializeGame() {
    console.log("🎮 Initializing game...");

    // Clear existing game objects
    this.clearGameObjects();

    // Setup game area
    this.setupGameArea();

    console.log("✅ Game initialized for room:", this.currentRoom);
  }

  startGameLoop() {
    console.log("🔄 Starting game loop...");

    // FIXED: Request initial game state
    if (this.socket && this.currentRoom) {
      this.socket.emit("get-game-state", {
        roomId: this.currentRoom,
        playerId: this.playerId,
      });
    }
  }

  setupGameArea() {
    if (!this.gameArea) return;

    // Set game area size
    this.gameArea.width = this.gameAreaWidth;
    this.gameArea.height = this.gameAreaHeight;

    // Set background color
    const background = this.gameArea.getComponent(cc.Sprite);
    if (background) {
      background.node.color = cc.Color.BLACK;
    }

    console.log("🎯 Game area setup complete");
  }

  updateGameDisplay(state) {
    if (!state) return;

    console.log("🔄 Updating game display...", state);

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
        this.keyboardEnabled = false; // Disable controls khi chết
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
    }

    this.updateSnakePosition(snakeNode, player);
  }

  createSnakeNode(player) {
    const snakeNode = cc.instantiate(this.snakePrefab);
    snakeNode.parent = this.gameArea;

    // Đảm bảo Snake component tồn tại
    let snakeScript = snakeNode.getComponent("Snake");
    if (!snakeScript) {
      snakeScript = snakeNode.addComponent("Snake");
    }

    // Khởi tạo snake với dữ liệu player
    snakeScript.initSnake(player.id, player);

    console.log(`🐍 Created snake node for player: ${player.id}`);
    return snakeNode;
  }

  updateSnakePosition(snakeNode, player) {
    // FIXED: Sử dụng Snake component thay vì tạo segments trực tiếp
    const snakeScript = snakeNode.getComponent("Snake");
    if (snakeScript) {
      snakeScript.updateSnake(player);
    } else {
      console.error("❌ Snake script not found on snake node");
    }
  }

  removePlayerSnake(playerId) {
    const snakeNode = this.playerSnakes.get(playerId);
    if (snakeNode) {
      snakeNode.destroy();
      this.playerSnakes.delete(playerId);
    }
  }

  updateFoods(foods) {
    // Remove dead foods
    this.foodNodes.forEach((foodNode, foodId) => {
      const food = foods.find((f) => f.id === foodId);
      if (!food || !food.alive) {
        foodNode.destroy();
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
      this.foodNodes.set(food.id, foodNode);
    }

    // Update position - FIXED: Convert coordinates
    const screenPos = this.gameToScreenPosition(food.position);
    foodNode.setPosition(screenPos.x, screenPos.y);
  }

  createFoodNode(food) {
    const foodNode = cc.instantiate(this.foodPrefab);
    foodNode.parent = this.gameArea;

    const foodScript = foodNode.getComponent("Food");
    foodScript.initFood(food.id, food);

    return foodNode;
  }

  // FIXED: Thêm function convert game coordinates to screen coordinates
  gameToScreenPosition(gamePos) {
    // Assuming game coordinates start from (0,0) at top-left
    // Convert to Cocos2d coordinates (center-based)
    const screenX = gamePos.x - this.gameAreaWidth / 2;
    const screenY = this.gameAreaHeight / 2 - gamePos.y;

    return { x: screenX, y: screenY };
  }

  sendPlayerMove(direction) {
    if (!this.currentRoom || !this.isGameActive) {
      console.log("🚫 Cannot send move - game not active");
      return;
    }

    console.log("🎮 Sending move:", direction);
    this.socket.emit("player-move", {
      roomId: this.currentRoom,
      playerId: this.playerId,
      direction: direction,
    });

    // FIXED: Show feedback to user
    this.updateStatus(`Moving: ${direction.x}, ${direction.y}`);
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
    this.updateStatus(
      `Game kết thúc! ${data.winner ? `Người thắng: ${data.winner}` : "Hòa"}`
    );

    // FIXED: Extend delay to see the result
    setTimeout(() => {
      this.showGameEndOptions();
    }, 5000);
  }

  showGameEndOptions() {
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
    // Clear all snakes
    this.playerSnakes.forEach((snake) => snake.destroy());
    this.playerSnakes.clear();

    // Clear all foods
    this.foodNodes.forEach((food) => food.destroy());
    this.foodNodes.clear();
  }

  onDestroy() {
    console.log("🧹 Cleaning up GameController...");

    // Disable game
    this.isGameActive = false;
    this.keyboardEnabled = false;

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

    if (this.keyboardSetup) {
      cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this);
    }
  }
}
