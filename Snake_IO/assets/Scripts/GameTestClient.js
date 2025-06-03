import SocketManager from './SocketManager';
import GameEvents from './GameEvents';
import MovementController from './MovementController';
import GameAnalyzer from './GameAnalyzer';
import FoodTester from './FoodTester';
import BotManager from './BotManager';

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameTestClient extends cc.Component {
  socketManager = null;
  gameEvents = null;
  movementController = null;
  gameAnalyzer = null;
  foodTester = null;
  botManager = null;

  testPhase = 0; // 0: join, 1: wait start, 2: move test, 3: food test

  start() {
    console.log("🧪 Starting Game Test Client");
    this.initializeComponents();
    this.setupEventHandlers();
    this.connectToServer();
  }

  initializeComponents() {
    this.socketManager = this.node.addComponent(SocketManager);
    this.gameEvents = this.node.addComponent(GameEvents);
    this.movementController = this.node.addComponent(MovementController);
    this.gameAnalyzer = this.node.addComponent(GameAnalyzer);
    this.foodTester = this.node.addComponent(FoodTester);
    this.botManager = this.node.addComponent(BotManager);
  }

  setupEventHandlers() {
    this.gameEvents.onJoinedRoom = (data) => {
      this.socketManager.currentRoom = data.roomId;
      this.botManager.setCurrentRoom(data.roomId);
      this.testPhase = 1;
      console.log("⏳ Waiting for other players to start game...");
    };

    this.gameEvents.onGameStarted = () => {
      this.testPhase = 2;
      this.movementController.startAutoMovement();
    };

    this.gameEvents.onGameState = (state) => {
      this.gameAnalyzer.analyzeGameState(state);
    };

    this.gameEvents.onGameEnded = (data) => {
      this.stopAllTests();
    };

    this.gameEvents.onRoomFull = () => {
      this.socketManager.joinRoom("room" + Math.floor(Math.random() * 1000));
    };

    this.setupKeyboardControls();
  }

  connectToServer() {
    const socket = this.socketManager.connect();
    
    socket.on("connect", () => {
      this.gameAnalyzer.init(this.socketManager.playerId);
      this.movementController.init(this.socketManager);
      this.foodTester.init(this.gameAnalyzer, this.movementController);
      
      this.socketManager.joinRoom();
    });

    socket.on("disconnect", () => {
      this.stopAllTests();
    });

    this.gameEvents.setupEvents(socket);
  }

  setupKeyboardControls() {
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
        if (!this.socketManager.currentRoom || this.testPhase < 2) return;

        switch (event.keyCode) {
          case cc.macro.KEY.space:
            this.foodTester.runFoodTest();
            break;
          case cc.macro.KEY.r:
            this.restartTest();
            break;
        }
      },
      this
    );
  }

  restartTest() {
    console.log("🔄 Restarting test...");
    this.stopAllTests();
    this.testPhase = 0;

    setTimeout(() => {
      if (this.socketManager.socket.connected) {
        this.socketManager.joinRoom("test-room-" + Date.now());
      }
    }, 1000);
  }

  stopAllTests() {
    this.movementController.stopAutoMovement();
    console.log("⏹️ All tests stopped");
  }

  onDestroy() {
    this.stopAllTests();
    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }

  // Public methods
  logCurrentState() {
    this.gameAnalyzer.logCurrentState();
  }

  testSpecificDirection(direction) {
    if (!this.socketManager.currentRoom || this.testPhase < 2) {
      console.log("❌ Game not ready for movement test");
      return;
    }
    this.movementController.testSpecificDirection(direction);
  }

  createMultipleTestPlayers(count = 2) {
    this.botManager.createMultipleTestPlayers(count);
  }

  runFoodTest() {
    this.foodTester.runFoodTest();
  }
}

// Console commands
console.log(`
🧪 Game Test Client Commands:
- Arrow keys / WASD: Manual control
- SPACE: Test food targeting
- R: Restart test
- In console:
  * gameTestClient.logCurrentState() - View current state
  * gameTestClient.testSpecificDirection({x:1,y:0}) - Test specific direction
  * gameTestClient.createMultipleTestPlayers(3) - Add 3 test bots
  * gameTestClient.runFoodTest() - Test food consumption
`);