const { ccclass, property } = cc._decorator;

@ccclass
export default class GameTestClient extends cc.Component {
  socket = null;
  playerId = null;
  currentRoom = null;
  gameState = null;

  // Test controls
  moveInterval = null;
  testPhase = 0; // 0: join, 1: wait start, 2: move test, 3: food test

  start() {
    console.log("🧪 Starting Game Test Client");

    // Kết nối tới server
    this.socket = window.io("http://localhost:3000", {
      transports: ["websocket"],
    });

    this.setupSocketEvents();
    this.setupKeyboardControls();
  }

  setupSocketEvents() {
    // Kết nối thành công
    this.socket.on("connect", () => {
      this.playerId = this.socket.id;
      console.log("✅ Connected to server, id:", this.playerId);

      this.joinRoom();
    });

    // Join room thành công
    this.socket.on("joined-room", (data) => {
      console.log("🎉 Joined room:", data);
      this.currentRoom = data.roomId;
      this.testPhase = 1;
      console.log("⏳ Waiting for other players to start game...");
    });

    // Game bắt đầu
    this.socket.on("game-started", () => {
      console.log("🚀 Game Started! Beginning movement tests...");
      this.testPhase = 2;
      this.startMovementTest();
    });

    // Cập nhật trạng thái game
    this.socket.on("game-state", (state) => {
      this.gameState = state;
      this.analyzeGameState(state);
    });

    // Game kết thúc
    this.socket.on("game-ended", (data) => {
      console.log("🏁 Game Ended:", data);
      this.stopAllTests();
    });

    // Room full
    this.socket.on("room-full", () => {
      console.log("🚫 Room is full, trying another room...");
      this.joinRoom("room" + Math.floor(Math.random() * 1000));
    });

    // Player events
    this.socket.on("player-joined", (data) => {
      console.log("👥 Player joined:", data);
    });

    this.socket.on("player-left", (data) => {
      console.log("👋 Player left:", data);
    });

    // Disconnect
    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
      this.stopAllTests();
    });
  }

  joinRoom(roomId = "test-room") {
    console.log("📥 Attempting to join room:", roomId);

    this.socket.emit("join-room", {
      roomId: roomId,
      playerId: this.playerId,
      playerName: `TestPlayer_${this.playerId.substring(0, 4)}`,
    });
  }

  startMovementTest() {
    console.log("🏃 Starting movement test - Snake will move in patterns");

    const directions = [
      { x: 1, y: 0 }, // Right
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
      { x: 0, y: -1 }, // Up
    ];

    let dirIndex = 0;

    // Test di chuyển theo pattern vuông
    this.moveInterval = setInterval(() => {
      const direction = directions[dirIndex];

      console.log(`➡️ Moving: ${this.getDirectionName(direction)}`);

      this.socket.emit("player-move", {
        roomId: this.currentRoom,
        playerId: this.playerId,
        direction: direction,
      });

      dirIndex = (dirIndex + 1) % directions.length;
    }, 2000); // Đổi hướng mỗi 2 giây
  }

  setupKeyboardControls() {
    // Thêm điều khiển bằng phím để test manual
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
        if (!this.currentRoom || this.testPhase < 2) return;

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
          case cc.macro.KEY.space:
            this.runFoodTest();
            return;
          case cc.macro.KEY.r:
            this.restartTest();
            return;
        }

        if (direction) {
          console.log(`🎮 Manual control: ${this.getDirectionName(direction)}`);
          this.socket.emit("player-move", {
            roomId: this.currentRoom,
            playerId: this.playerId,
            direction: direction,
          });
        }
      },
      this
    );
  }

  analyzeGameState(state) {
    if (!state.players) return;

    const myPlayer = state.players.find((p) => p.id === this.playerId);
    if (!myPlayer) return;

    // Log trạng thái player
    console.log(`🐍 Player Status:`, {
      position: myPlayer.position,
      score: myPlayer.score,
      alive: myPlayer.alive,
      bodyLength: myPlayer.body.length,
    });

    // Kiểm tra food
    if (state.foods && state.foods.length > 0) {
      const nearbyFood = this.findNearbyFood(myPlayer.position, state.foods);
      if (nearbyFood.length > 0) {
        console.log(`🍎 Nearby food:`, nearbyFood);
        this.testPhase = 3; // Chuyển sang test ăn food
      }
    }

    // Test collision detection
    if (!myPlayer.alive) {
      console.log("💥 Player died! Testing collision detection...");
      this.analyzeDeathCause(myPlayer, state);
    }
  }

  findNearbyFood(playerPos, foods) {
    return foods.filter((food) => {
      if (!food.alive) return false;

      const distance = Math.sqrt(
        Math.pow(playerPos.x - food.position.x, 2) +
          Math.pow(playerPos.y - food.position.y, 2)
      );

      return distance < 50; // Trong bán kính 50px
    });
  }

  runFoodTest() {
    if (!this.gameState || !this.gameState.foods) {
      console.log("🍎 No food data available for testing");
      return;
    }

    console.log("🍎 Running food consumption test...");

    const myPlayer = this.gameState.players.find((p) => p.id === this.playerId);
    if (!myPlayer) return;

    const foods = this.gameState.foods.filter((f) => f.alive);
    if (foods.length === 0) {
      console.log("🍎 No food available");
      return;
    }

    // Tìm food gần nhất
    const nearestFood = foods.reduce((nearest, food) => {
      const distToFood = Math.sqrt(
        Math.pow(myPlayer.position.x - food.position.x, 2) +
          Math.pow(myPlayer.position.y - food.position.y, 2)
      );

      const distToNearest = nearest
        ? Math.sqrt(
            Math.pow(myPlayer.position.x - nearest.position.x, 2) +
              Math.pow(myPlayer.position.y - nearest.position.y, 2)
          )
        : Infinity;

      return distToFood < distToNearest ? food : nearest;
    }, null);

    if (nearestFood) {
      console.log(`🎯 Targeting food at:`, nearestFood.position);
      this.moveTowardsFood(myPlayer.position, nearestFood.position);
    }
  }

  moveTowardsFood(playerPos, foodPos) {
    const dx = foodPos.x - playerPos.x;
    const dy = foodPos.y - playerPos.y;

    let direction;

    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      direction = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }

    console.log(`🏃 Moving towards food: ${this.getDirectionName(direction)}`);

    this.socket.emit("player-move", {
      roomId: this.currentRoom,
      playerId: this.playerId,
      direction: direction,
    });
  }

  analyzeDeathCause(player, gameState) {
    const pos = player.position;
    const { width, height } = { width: 800, height: 600 }; // Default room config

    // Check wall collision
    if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) {
      console.log("💥 Death cause: Wall collision");
      return;
    }

    // Check self collision
    const head = player.body[0];
    const selfCollision = player.body
      .slice(1)
      .some((segment) => segment.x === head.x && segment.y === head.y);

    if (selfCollision) {
      console.log("💥 Death cause: Self collision");
      return;
    }

    // Check player collision
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

  getDirectionName(direction) {
    if (direction.x === 1) return "RIGHT";
    if (direction.x === -1) return "LEFT";
    if (direction.y === 1) return "DOWN";
    if (direction.y === -1) return "UP";
    return "UNKNOWN";
  }

  restartTest() {
    console.log("🔄 Restarting test...");
    this.stopAllTests();
    this.testPhase = 0;

    // Reconnect after short delay
    setTimeout(() => {
      if (this.socket.connected) {
        this.joinRoom("test-room-" + Date.now());
      }
    }, 1000);
  }

  stopAllTests() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }

    console.log("⏹️ All tests stopped");
  }

  onDestroy() {
    this.stopAllTests();

    if (this.socket) {
      this.socket.disconnect();
    }

    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }

  // Public methods để gọi từ UI hoặc console
  logCurrentState() {
    console.log("📊 Current Game State:", this.gameState);
  }

  testSpecificDirection(direction) {
    if (!this.currentRoom || this.testPhase < 2) {
      console.log("❌ Game not ready for movement test");
      return;
    }

    console.log(`🧪 Testing direction: ${this.getDirectionName(direction)}`);
    this.socket.emit("player-move", {
      roomId: this.currentRoom,
      playerId: this.playerId,
      direction: direction,
    });
  }

  createMultipleTestPlayers(count = 2) {
    console.log(`👥 Creating ${count} additional test players...`);

    for (let i = 1; i <= count; i++) {
      setTimeout(() => {
        const testSocket = window.io("http://localhost:3000", {
          transports: ["websocket"],
        });

        testSocket.on("connect", () => {
          console.log(`🤖 Test bot ${i} connected:`, testSocket.id);

          testSocket.emit("join-room", {
            roomId: this.currentRoom,
            playerId: testSocket.id,
            playerName: `TestBot_${i}`,
          });
        });

        // Simple AI movement for test bots
        testSocket.on("game-started", () => {
          const directions = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 0, y: -1 },
          ];

          setInterval(() => {
            const randomDir =
              directions[Math.floor(Math.random() * directions.length)];
            testSocket.emit("player-move", {
              roomId: this.currentRoom,
              playerId: testSocket.id,
              direction: randomDir,
            });
          }, 1000 + Math.random() * 2000);
        });
      }, i * 500); // Delay để tránh spam
    }
  }
}

// Console commands để test
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
