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
  playerSnakes = new Map(); // playerId -> snake node
  foodNodes = new Map(); // foodId -> food node

  // Game settings
  gameAreaWidth = 800;
  gameAreaHeight = 600;
  gridSize = 20;

  start() {
    console.log("🎮 Starting Game Controller");

    // Lấy socket từ global hoặc tạo mới
    this.socket =
      window.gameSocket ||
      window.io("http://localhost:3000", {
        transports: ["websocket"],
      });

    this.playerId = this.socket.id;
    this.setupSocketEvents();
    this.setupKeyboardControls();

    // Đặt status ban đầu
    this.updateStatus("Đang chờ bắt đầu game...");
  }

  setupSocketEvents() {
    // Game bắt đầu
    this.socket.on("game-started", () => {
      console.log("🚀 Game Started!");
      this.updateStatus("Game đã bắt đầu!");
      this.initializeGame();
    });

    // Cập nhật trạng thái game
    this.socket.on("game-state", (state) => {
      this.gameState = state;
      this.updateGameDisplay(state);
    });

    // Game kết thúc
    this.socket.on("game-ended", (data) => {
      console.log("🏁 Game Ended:", data);
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

    // Disconnect
    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
      this.updateStatus("Mất kết nối server");
    });
  }

  setupKeyboardControls() {
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
        if (!this.currentRoom || !this.gameState) return;

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
    // Lấy room ID từ global storage hoặc socket
    this.currentRoom = window.currentRoomId;

    // Clear existing game objects
    this.clearGameObjects();

    // Setup game area
    this.setupGameArea();

    console.log("🎮 Game initialized for room:", this.currentRoom);
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
  }

  updateGameDisplay(state) {
    if (!state) return;

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
    }

    this.updateSnakePosition(snakeNode, player);
  }

  createSnakeNode(player) {
    const snakeNode = new cc.Node(`Snake_${player.id}`);
    snakeNode.parent = this.gameArea;

    // Tạo các segment cho snake body
    player.body.forEach((segment, index) => {
      const segmentNode = new cc.Node(`Segment_${index}`);
      segmentNode.parent = snakeNode;

      // Add sprite component
      const sprite = segmentNode.addComponent(cc.Sprite);

      // Set color - head khác màu body
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

    // Update position
    foodNode.setPosition(food.position.x, food.position.y);
  }

  createFoodNode(food) {
    const foodNode = new cc.Node(`Food_${food.id}`);
    foodNode.parent = this.gameArea;

    // Add sprite component
    const sprite = foodNode.addComponent(cc.Sprite);

    // Set color (red for food)
    foodNode.color = cc.Color.RED;

    // Set size
    foodNode.width = this.gridSize;
    foodNode.height = this.gridSize;

    // Set position
    foodNode.setPosition(food.position.x, food.position.y);

    return foodNode;
  }

  sendPlayerMove(direction) {
    if (!this.currentRoom) return;

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
    this.updateStatus(
      `Game kết thúc! ${data.winner ? `Người thắng: ${data.winner}` : "Hòa"}`
    );

    // Show game end UI after delay
    setTimeout(() => {
      this.showGameEndOptions();
    }, 3000);
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
    // Clean up
    this.clearGameObjects();

    if (this.socket) {
      this.socket.off("game-started");
      this.socket.off("game-state");
      this.socket.off("game-ended");
      this.socket.off("player-joined");
      this.socket.off("player-left");
      this.socket.off("disconnect");
    }

    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }
}
