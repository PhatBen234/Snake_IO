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

  // NEW: Score table pop-up properties
  @property(cc.Node)
  scoreTablePopup = null;

  @property(cc.Label)
  gameResultTitle = null;

  @property(cc.Node)
  scoreTableContent = null;

  @property(cc.Button)
  backToLobbyButton = null;

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
  quitConfirmTimer = null;

  start() {
    this.resetGameState();
    this.initialize();
    this.setupScoreTablePopup();
  }

  // NEW: Setup score table pop-up
  setupScoreTablePopup() {
    if (this.scoreTablePopup) {
      this.scoreTablePopup.active = false;
    }

    if (this.backToLobbyButton) {
      this.backToLobbyButton.node.on("click", this.onBackToLobbyClick, this);
    }
  }

  // NEW: Handle back to lobby button click
  onBackToLobbyClick() {
    this.hideScoreTablePopup();
    this.showGameEndOptions();
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
      "quit-room-success",
      "quit-room-failed",
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

        // Quit room with ESC key
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

  quitRoom() {
    if (!this.socket || !this.currentRoom || !this.playerId) {
      this.updateStatus("Cannot leave room - missing information!");
      return;
    }

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

  // UPDATED: Handle game end with score table pop-up
  handleGameEnd(data) {
    this.isGameActive = false;
    this.updateStatus(
      `Game ended! ${data.winner ? `Winner: ${data.winner}` : "Draw"}`
    );

    // Show score table pop-up instead of logging
    if (this.gameState && this.gameState.players) {
      setTimeout(() => this.showScoreTablePopup(data), 1500);
    }

    setTimeout(() => this.clearGameObjects(), 1500);
  }

  // NEW: Show score table pop-up
  showScoreTablePopup(gameEndData) {
    if (!this.scoreTablePopup || !this.gameState?.players) return;

    // Show the popup
    this.scoreTablePopup.active = true;

    // Set game result title
    if (this.gameResultTitle) {
      if (gameEndData.winner) {
        this.gameResultTitle.string = `🎉 Winner: ${gameEndData.winner}`;
        this.gameResultTitle.node.color = cc.Color.YELLOW;
      } else {
        this.gameResultTitle.string = "🤝 Game Draw!";
        this.gameResultTitle.node.color = cc.Color.WHITE;
      }
    }

    // Create score table
    this.createScoreTable();

    // Add entrance animation
    this.animateScoreTableEntrance();
  }

  // NEW: Create score table content
  createScoreTable() {
    if (!this.scoreTableContent) return;

    // Clear existing content
    this.scoreTableContent.removeAllChildren();

    // Sort players by score (descending)
    const sortedPlayers = [...this.gameState.players].sort(
      (a, b) => b.score - a.score
    );

    // Create header
    const headerNode = this.createScoreTableRow(
      "Rank",
      "Player",
      "Score",
      true
    );
    headerNode.parent = this.scoreTableContent;
    headerNode.y = 80;

    // Create player rows
    sortedPlayers.forEach((player, index) => {
      const rank = index + 1;
      const playerName = player.name || `Player ${rank}`;
      const score = player.score.toString();

      const rowNode = this.createScoreTableRow(
        rank.toString(),
        playerName,
        score,
        false
      );
      rowNode.parent = this.scoreTableContent;
      rowNode.y = 80 - (index + 1) * 40; // 40px spacing between rows

      // Highlight winner
      if (
        player.id ===
        this.gameState.players.find(
          (p) =>
            p.score === Math.max(...this.gameState.players.map((p) => p.score))
        )?.id
      ) {
        this.highlightWinnerRow(rowNode);
      }

      // Highlight current player
      if (player.id === this.playerId) {
        this.highlightCurrentPlayerRow(rowNode);
      }
    });
  }

  // NEW: Create a score table row
  createScoreTableRow(rank, playerName, score, isHeader) {
    const rowNode = new cc.Node("ScoreRow");
    rowNode.width = 400;
    rowNode.height = 35;

    // Background
    const bg = rowNode.addComponent(cc.Sprite);
    if (isHeader) {
      rowNode.color = new cc.Color(70, 70, 70);
    } else {
      rowNode.color = new cc.Color(40, 40, 40);
    }

    // Rank
    const rankNode = new cc.Node("Rank");
    rankNode.parent = rowNode;
    rankNode.x = -150;
    const rankLabel = rankNode.addComponent(cc.Label);
    rankLabel.string = rank;
    rankLabel.fontSize = isHeader ? 16 : 14;
    rankLabel.node.color = isHeader ? cc.Color.YELLOW : cc.Color.WHITE;

    // Player Name
    const nameNode = new cc.Node("PlayerName");
    nameNode.parent = rowNode;
    nameNode.x = -20;
    const nameLabel = nameNode.addComponent(cc.Label);
    nameLabel.string = playerName;
    nameLabel.fontSize = isHeader ? 16 : 14;
    nameLabel.node.color = isHeader ? cc.Color.YELLOW : cc.Color.WHITE;

    // Score
    const scoreNode = new cc.Node("Score");
    scoreNode.parent = rowNode;
    scoreNode.x = 120;
    const scoreLabel = scoreNode.addComponent(cc.Label);
    scoreLabel.string = score;
    scoreLabel.fontSize = isHeader ? 16 : 14;
    scoreLabel.node.color = isHeader ? cc.Color.YELLOW : cc.Color.WHITE;

    return rowNode;
  }

  // NEW: Highlight winner row
  highlightWinnerRow(rowNode) {
    // Add crown icon or special background
    rowNode.color = new cc.Color(255, 215, 0, 100); // Golden background

    // Add winner crown
    const crownNode = new cc.Node("Crown");
    crownNode.parent = rowNode;
    crownNode.x = -180;
    const crownLabel = crownNode.addComponent(cc.Label);
    crownLabel.string = "👑";
    crownLabel.fontSize = 20;

    // Add glow effect
    const glowAction = cc.sequence(cc.scaleTo(0.5, 1.1), cc.scaleTo(0.5, 1.0));
    rowNode.runAction(cc.repeatForever(glowAction));
  }

  // NEW: Highlight current player row
  highlightCurrentPlayerRow(rowNode) {
    // Add border or different background for current player
    rowNode.color = new cc.Color(0, 100, 200, 150); // Blue background

    // Add "YOU" indicator
    const youNode = new cc.Node("YouIndicator");
    youNode.parent = rowNode;
    youNode.x = 170;
    const youLabel = youNode.addComponent(cc.Label);
    youLabel.string = "YOU";
    youLabel.fontSize = 12;
    youLabel.node.color = cc.Color.CYAN;
  }

  // NEW: Animate score table entrance
  animateScoreTableEntrance() {
    if (!this.scoreTablePopup) return;

    // Start from scale 0
    this.scoreTablePopup.scale = 0;
    this.scoreTablePopup.opacity = 0;

    // Animate to full size with bounce effect
    const scaleAction = cc.sequence(cc.scaleTo(0.3, 1.2), cc.scaleTo(0.2, 1.0));

    const fadeAction = cc.fadeTo(0.3, 255);

    this.scoreTablePopup.runAction(cc.spawn(scaleAction, fadeAction));
  }

  // NEW: Hide score table pop-up
  hideScoreTablePopup() {
    if (!this.scoreTablePopup) return;

    // Animate out
    const scaleAction = cc.scaleTo(0.2, 0);
    const fadeAction = cc.fadeTo(0.2, 0);
    const hideAction = cc.callFunc(() => {
      this.scoreTablePopup.active = false;
    });

    const sequence = cc.sequence(cc.spawn(scaleAction, fadeAction), hideAction);

    this.scoreTablePopup.runAction(sequence);
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

    if (this.quitConfirmTimer) {
      clearTimeout(this.quitConfirmTimer);
      this.quitConfirmTimer = null;
    }

    // Hide score table popup
    if (this.scoreTablePopup) {
      this.scoreTablePopup.active = false;
    }
  }

  onDestroy() {
    this.isGameActive = false;
    this.isInitialized = false;
    this.clearGameObjects();

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
        "quit-room-success",
        "quit-room-failed",
      ].forEach((event) => this.socket.off(event));
    }

    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }
}