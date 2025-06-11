import { GameConfig } from "./GameConfig";

export default class InputManager {
  constructor() {
    this.eventHandlers = {};
    this.canProcessInputCallback = null;
  }

  initialize(config) {
    this.eventHandlers = {
      onMove: config.onMove,
      onQuit: config.onQuit,
    };
    this.canProcessInputCallback = config.canProcessInput;
  }

  setupControls() {
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      this.handleKeyDown.bind(this),
      this
    );
  }

  handleKeyDown(event) {
    // Movement controls
    if (this.canProcessInputCallback()) {
      const direction = this.getDirectionFromKey(event.keyCode);
      if (direction) {
        this.eventHandlers.onMove(direction);
      }
    }

    // Quit room with ESC key
    if (event.keyCode === GameConfig.QUIT_KEY) {
      this.eventHandlers.onQuit();
    }
  }

  getDirectionFromKey(keyCode) {
    return GameConfig.MOVEMENT_KEYS[keyCode] || null;
  }

  cleanup() {
    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN);
  }
}
