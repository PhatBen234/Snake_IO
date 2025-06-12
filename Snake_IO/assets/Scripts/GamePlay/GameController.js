const { ccclass, property } = cc._decorator;

import SocketManager from "./SocketManagerController";
import GameStateManager from "./GameStateManager";
import InputManager from "./InputManager";
import UIManager from "./UIManager";
import LeaderboardManager from "./LeaderboardManager";
import ScreenshotManager from "./ScreenshotManager";
import { GameConfig } from "./GameConfig";

@ccclass
export default class GameController extends cc.Component {
  // UI Properties
  @property(cc.Prefab) snakePrefab = null;
  @property(cc.Prefab) foodPrefab = null;
  @property(cc.Node) gameArea = null;
  @property(cc.Label) scoreLabel = null;
  @property(cc.Label) statusLabel = null;
  @property(cc.Node) scoreTablePopup = null;
  @property(cc.Node) scoreTableContent = null;
  @property(cc.Prefab) scoreLabelPrefab = null;
  @property(cc.Button) backToLobbyButton = null;
  @property(cc.Node) chatControllerNode = null;
  @property(cc.Camera) screenshotCamera = null;

  // Managers
  socketManager = null;
  gameStateManager = null;
  inputManager = null;
  uiManager = null;
  leaderboardManager = null;
  screenshotManager = null;

  // Game State
  isInitialized = false;
  // NEW: Add flag to track if initialization is complete
  isFullyInitialized = false;

  start() {
    this.initializeManagers();
    this.initialize();
  }

  initializeManagers() {
    // Initialize all managers
    this.socketManager = new SocketManager();
    this.gameStateManager = new GameStateManager();
    this.inputManager = new InputManager();
    this.uiManager = new UIManager();
    this.leaderboardManager = new LeaderboardManager();
    this.screenshotManager = new ScreenshotManager();

    // Pass references to managers
    this.setupManagerReferences();
  }

  setupManagerReferences() {
    // UI Manager setup
    this.uiManager.initialize({
      scoreLabel: this.scoreLabel,
      statusLabel: this.statusLabel,
      scoreTablePopup: this.scoreTablePopup,
      backToLobbyButton: this.backToLobbyButton,
      chatControllerNode: this.chatControllerNode,
      onBackToLobby: this.handleBackToLobby.bind(this),
    });

    // Game State Manager setup
    this.gameStateManager.initialize({
      gameArea: this.gameArea,
      snakePrefab: this.snakePrefab,
      foodPrefab: this.foodPrefab,
      canvasWidth: GameConfig.CANVAS_WIDTH,
      canvasHeight: GameConfig.CANVAS_HEIGHT,
      gridSize: GameConfig.GRID_SIZE,
    });

    // Socket Manager setup
    this.socketManager.initialize({
      onGameStarted: this.handleGameStarted.bind(this),
      onGameState: this.handleGameState.bind(this),
      onGameEnded: this.handleGameEnded.bind(this),
      onPlayerLeft: this.handlePlayerLeft.bind(this),
      onStartGameFailed: this.handleStartGameFailed.bind(this),
      onQuitRoomSuccess: this.handleQuitRoomSuccess.bind(this),
      onQuitRoomFailed: this.handleQuitRoomFailed.bind(this),
    });

    // Input Manager setup
    this.inputManager.initialize({
      onMove: this.handlePlayerMove.bind(this),
      onQuit: this.handleQuitRoom.bind(this),
      canProcessInput: () => this.canProcessInput(),
    });

    // Leaderboard Manager setup
    this.leaderboardManager.initialize({
      scoreTablePopup: this.scoreTablePopup,
      scoreTableContent: this.scoreTableContent,
      scoreLabelPrefab: this.scoreLabelPrefab,
    });

    // Screenshot Manager setup
    this.screenshotManager.initialize({
      screenshotCamera: this.screenshotCamera,
      currentRoom: () => this.socketManager.getCurrentRoom(),
    });
  }

  async initialize() {
    try {
      // UPDATED: Show loading status
      this.uiManager.updateStatus("Initializing game...");

      await this.socketManager.connect();
      this.gameStateManager.setupGameArea();
      this.inputManager.setupControls();

      this.isInitialized = true;

      // UPDATED: Add small delay to ensure everything is properly set up
      this.uiManager.updateStatus("Ready - Starting game...");

      // UPDATED: Wait a bit more to ensure all components are ready
      setTimeout(() => {
        this.isFullyInitialized = true;
        this.uiManager.updateStatus("Ready - Game starting...");
        this.autoStartGame();
      }, 2000); // Increased delay to 2 seconds
    } catch (error) {
      this.uiManager.updateStatus(
        "Initialization error - Returning to lobby..."
      );
      setTimeout(() => cc.director.loadScene("JoinRoom"), 2000);
    }
  }

  // Game Event Handlers
  handleGameStarted(data) {
    // UPDATED: Only handle game start if fully initialized
    if (this.isFullyInitialized) {
      this.gameStateManager.startGame();
      this.uiManager.updateStatus("Game started!");
    } else {
      // If not ready yet, wait and try again
      console.log(
        "Game start received but not fully initialized yet, waiting..."
      );
      setTimeout(() => {
        if (this.isFullyInitialized) {
          this.gameStateManager.startGame();
          this.uiManager.updateStatus("Game started!");
        }
      }, 1000);
    }
  }

  handleGameState(state) {
    // UPDATED: Check if fully initialized
    if (
      this.isFullyInitialized &&
      this.gameStateManager.isGameActive() &&
      state
    ) {
      this.gameStateManager.updateGameState(state);
      this.updateGameDisplay(state);
    }
  }

  handleGameEnded(data) {
    this.gameStateManager.endGame();
    this.uiManager.showGameEndMessage(data);

    // Send message to chat
    this.uiManager.sendChatMessage(this.uiManager.getGameEndMessage(data));

    // Show leaderboard
    if (data.scores && data.scores.length > 0) {
      this.gameStateManager.updatePlayersFromScores(data.scores);
      setTimeout(() => this.showLeaderboard(), 1500);
    } else if (this.gameStateManager.hasPlayers()) {
      setTimeout(() => this.showLeaderboard(), 1500);
    }

    setTimeout(() => this.gameStateManager.clearGameObjects(), 1500);
  }

  handlePlayerLeft(data) {
    this.gameStateManager.removePlayer(data.playerId);
    this.uiManager.showPlayerLeftMessage(data);
  }

  handleStartGameFailed(data) {
    this.uiManager.updateStatus(`Cannot start game: ${data.reason}`);
  }

  handleQuitRoomSuccess(data) {
    this.uiManager.updateStatus("Successfully left the room!");
    this.resetGame();
    setTimeout(() => cc.director.loadScene("JoinRoom"), 1000);
  }

  handleQuitRoomFailed(data) {
    this.uiManager.updateStatus(`Cannot leave room: ${data.reason}`);
  }

  handlePlayerMove(direction) {
    if (this.canProcessInput()) {
      this.socketManager.sendPlayerMove(direction);
    }
  }

  handleQuitRoom() {
    this.socketManager.quitRoom(
      this.gameStateManager.isGameActive(),
      (message) => this.uiManager.updateStatus(message),
      () => this.uiManager.clearChatHistory()
    );
  }

  handleBackToLobby() {
    this.uiManager.hideScoreTablePopup();
    this.showGameEndOptions();
  }

  // Game Logic
  canProcessInput() {
    return (
      this.isFullyInitialized && // UPDATED: Use isFullyInitialized instead of isInitialized
      this.gameStateManager.isGameActive() &&
      this.socketManager.isConnected() &&
      this.gameStateManager.hasGameState()
    );
  }

  autoStartGame() {
    // UPDATED: Check both flags before starting
    if (this.isFullyInitialized && this.socketManager.isConnected()) {
      console.log("Auto starting game - all systems ready");
      this.socketManager.startGame();
    } else {
      console.log("Cannot auto start - not fully initialized yet");
    }
  }

  updateGameDisplay(state) {
    if (state.players) {
      this.gameStateManager.updatePlayers(state.players);
    }

    if (state.foods) {
      this.gameStateManager.updateFoods(state.foods);
    }

    const myPlayer = this.socketManager.getMyPlayer(state.players);
    if (myPlayer) {
      if (myPlayer.alive) {
      this.uiManager.updateScore(myPlayer.score);
    }
  
    if (!myPlayer.alive) {
      this.uiManager.updateStatus("You died!");
    }
    }
  }

  async showLeaderboard() {
    const playersData = this.gameStateManager.getPlayersData();
    if (!playersData) return;

    this.leaderboardManager.show(playersData);

    // Capture screenshot after animation
    setTimeout(async () => {
      const screenshot = await this.screenshotManager.captureLeaderboard(
        this.scoreTablePopup,
        playersData
      );

      if (screenshot) {
        await this.screenshotManager.uploadScreenshot(screenshot, playersData);
      }
    }, 1000);
  }

  showGameEndOptions() {
    this.resetGame();
    cc.director.loadScene("JoinRoom");
  }

  resetGame() {
    this.gameStateManager.reset();
    this.socketManager.reset();
    this.uiManager.reset();
    this.isInitialized = false;
    this.isFullyInitialized = false; // UPDATED: Reset both flags
  }

  onDestroy() {
    this.resetGame();
    this.inputManager?.cleanup();
    this.socketManager?.cleanup();
  }
}
