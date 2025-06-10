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

  // Simplified leaderboard properties
  @property(cc.Node)
  scoreTablePopup = null;

  @property(cc.Node)
  scoreTableContent = null;

  @property(cc.Prefab)
  scoreLabelPrefab = null;

  @property(cc.Button)
  backToLobbyButton = null;

  @property(cc.Node)
  chatControllerNode = null;

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

  // Setup score table pop-up
  setupScoreTablePopup() {
    if (this.scoreTablePopup) {
      this.scoreTablePopup.active = false;
    }

    if (this.backToLobbyButton) {
      this.backToLobbyButton.node.on("click", this.onBackToLobbyClick, this);
    }
  }

  // Handle back to lobby button click
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

      // Update gameState when player quits
      if (this.gameState && this.gameState.players) {
        const playerIndex = this.gameState.players.findIndex(
          (p) => p.id === data.playerId
        );
        if (playerIndex !== -1) {
          this.gameState.players[playerIndex].score = 0;
          this.gameState.players[playerIndex].alive = false;
        }
      }

      if (data.reason === "quit" || data.reason === "disconnect") {
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
    
    // Clear chat history through ChatController
    if (this.chatControllerNode) {
      const chatController = this.chatControllerNode.getComponent('ChatController');
      if (chatController) {
        chatController.clearChatHistory();
      }
    }
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

  // Simplified game end handler
  handleGameEnd(data) {
    this.isGameActive = false;

    let statusMessage = '';
    if (data.isDraw) {
      statusMessage = 'Game ended in a draw!';
    } else if (data.winner) {
      statusMessage = `Game ended! Winner: ${data.winner}`;
    } else {
      statusMessage = 'Game ended!';
    }

    this.updateStatus(statusMessage);

    // Send game end message to chat through ChatController
    if (this.chatControllerNode) {
      const chatController = this.chatControllerNode.getComponent('ChatController');
      if (chatController) {
        chatController.displaySystemMessage(statusMessage, cc.Color.YELLOW);
      }
    }

    // Use data from server instead of local gameState
    if (data.scores && data.scores.length > 0) {
      // Update gameState with accurate data from server
      if (this.gameState) {
        this.gameState.players = data.scores.map((scoreData) => ({
          id: scoreData.id,
          name: scoreData.name,
          score: scoreData.score,
          alive: scoreData.status === "alive",
        }));
      }

      setTimeout(() => this.showLeaderboard(), 1500);
    } else if (this.gameState && this.gameState.players) {
      // Fallback using current gameState
      setTimeout(() => this.showLeaderboard(), 1500);
    }

    setTimeout(() => this.clearGameObjects(), 1500);
  }

  // Simplified leaderboard display
  showLeaderboard() {
    if (
      !this.scoreTablePopup ||
      !this.scoreTableContent ||
      !this.scoreLabelPrefab
    ) {
      return;
    }

    let playersData = [];

    // Prioritize using data from gameState
    if (this.gameState?.players) {
      playersData = this.gameState.players;
    } else {
      return;
    }

    // Show the popup
    this.scoreTablePopup.active = true;

    // Clear existing content
    this.scoreTableContent.removeAllChildren();

    // Sort players by score (descending) and get top 3
    const top3Players = [...playersData]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Create score labels for top 3 players
    top3Players.forEach((player, index) => {
      this.createPlayerScoreLabel(player, index);
    });

    // Add entrance animation
    this.animateScoreTableEntrance();
  }

  // Create individual player score label
  createPlayerScoreLabel(player, index) {
    const rank = index + 1;
    const playerName =
      player.name || `Player_${player.id?.substring(0, 4) || rank}`;

    // Create score label from prefab
    const scoreLabelNode = cc.instantiate(this.scoreLabelPrefab);
    scoreLabelNode.parent = this.scoreTableContent;

    // Position the labels vertically
    scoreLabelNode.y = 100 - index * 80;

    // Find the label component
    let labelComponent = this.findLabelComponent(scoreLabelNode);

    if (labelComponent) {
      // Set the text content with rank indicator
      const displayText = `${playerName}\nScore: ${player.score}`;
      labelComponent.string = displayText;

      // Set rank colors
      labelComponent.node.color = this.getRankColor(rank);
    }

    // Add entrance animation
    this.animateScoreLabel(scoreLabelNode, index);
  }

  // Find label component in node or its children
  findLabelComponent(node) {
    // Check root node first
    let labelComponent = node.getComponent(cc.Label);

    if (!labelComponent) {
      // Search in children recursively
      const findInChildren = (parent) => {
        for (let child of parent.children) {
          const label = child.getComponent(cc.Label);
          if (label) return label;

          const childResult = findInChildren(child);
          if (childResult) return childResult;
        }
        return null;
      };

      labelComponent = findInChildren(node);
    }

    return labelComponent;
  }

  // Get color for different ranks
  getRankColor(rank) {
    switch (rank) {
      case 1:
        return cc.Color.YELLOW; // Gold
      case 2:
        return new cc.Color(192, 192, 192); // Silver
      case 3:
        return new cc.Color(205, 127, 50); // Bronze
      default:
        return cc.Color.WHITE;
    }
  }

  // Animate individual score labels
  animateScoreLabel(labelNode, index) {
    // Start from the right and fade in
    labelNode.x = 300;
    labelNode.opacity = 0;

    // Stagger animations
    const delay = index * 0.3;

    const moveAction = cc.moveTo(0.5, cc.v2(0, labelNode.y));
    const fadeAction = cc.fadeTo(0.5, 255);
    const delayAction = cc.delayTime(delay);

    const sequence = cc.sequence(delayAction, cc.spawn(moveAction, fadeAction));

    labelNode.runAction(sequence);
  }

  // Animate score table entrance
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

  // Hide score table pop-up
  hideScoreTablePopup() {
    if (!this.scoreTablePopup) return;

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