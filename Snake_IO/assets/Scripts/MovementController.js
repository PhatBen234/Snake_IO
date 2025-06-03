const { ccclass, property } = cc._decorator;

@ccclass
export default class MovementController extends cc.Component {
  socketManager = null;
  moveInterval = null;
  isAutoMoving = false;

  directions = [
    { x: 1, y: 0 },  // Right
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }, // Left
    { x: 0, y: -1 }, // Up
  ];

  init(socketManager) {
    this.socketManager = socketManager;
    this.setupKeyboardControls();
  }

  startAutoMovement() {
    if (this.isAutoMoving) return;

    console.log("🏃 Starting movement test - Snake will move in patterns");
    
    let dirIndex = 0;
    this.isAutoMoving = true;

    this.moveInterval = setInterval(() => {
      const direction = this.directions[dirIndex];
      console.log(`➡️ Moving: ${this.getDirectionName(direction)}`);
      
      this.socketManager.sendMove(direction);
      dirIndex = (dirIndex + 1) % this.directions.length;
    }, 2000);
  }

  stopAutoMovement() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
      this.isAutoMoving = false;
    }
  }

  setupKeyboardControls() {
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
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
          console.log(`🎮 Manual control: ${this.getDirectionName(direction)}`);
          this.socketManager.sendMove(direction);
        }
      },
      this
    );
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
    this.socketManager.sendMove(direction);
  }

  testSpecificDirection(direction) {
    console.log(`🧪 Testing direction: ${this.getDirectionName(direction)}`);
    this.socketManager.sendMove(direction);
  }

  getDirectionName(direction) {
    if (direction.x === 1) return "RIGHT";
    if (direction.x === -1) return "LEFT";
    if (direction.y === 1) return "DOWN";
    if (direction.y === -1) return "UP";
    return "UNKNOWN";
  }

  onDestroy() {
    this.stopAutoMovement();
    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }
}