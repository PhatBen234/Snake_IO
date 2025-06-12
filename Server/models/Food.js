const GAME_CONSTANTS = require("../config/constants");

class Food {
  constructor(id, position, type = GAME_CONSTANTS.FOOD_TYPES.NORMAL) {
    this.id = id;
    this.position = position;
    this.alive = true;
    this.type = type;
    this.value = type === GAME_CONSTANTS.FOOD_TYPES.SPEED ? 0 : 1; // Speed food không tăng size
  }

  destroy(targetId) {
    if (this.id === targetId) {
      this.alive = false;
      console.log(`Food: ${this.id} (${this.type}) is destroyed!`);
      return true;
    }
    return false;
  }
}

module.exports = Food;
