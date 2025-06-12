// 3. models/Player.js - Cập nhật Player model (cần tạo file này nếu chưa có)
const GAME_CONSTANTS = require("../config/constants");

class Player {
  constructor(id, name, startPosition) {
    this.id = id;
    this.name = name;
    this.position = startPosition;
    this.body = [{ ...startPosition }];
    this.direction = { x: 0, y: 0 };
    this.length = 1;
    this.score = 0;
    this.alive = true;
    this.baseSpeed = GAME_CONSTANTS.PLAYER_SPEED;
    this.currentSpeed = GAME_CONSTANTS.PLAYER_SPEED;
    this.speedBoostEndTime = 0; // Thời gian kết thúc speed boost
  }

  // Kiểm tra xem player có đang speed boost không
  hasSpeedBoost() {
    return Date.now() < this.speedBoostEndTime;
  }

  // Cập nhật tốc độ hiện tại
  updateSpeed() {
    if (this.hasSpeedBoost()) {
      this.currentSpeed =
        this.baseSpeed * GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER;
    } else {
      this.currentSpeed = this.baseSpeed;
    }
  }

  // Áp dụng speed boost
  applySpeedBoost() {
    this.speedBoostEndTime = Date.now() + GAME_CONSTANTS.SPEED_BOOST_DURATION;
    this.updateSpeed();
  }
}

module.exports = Player;
