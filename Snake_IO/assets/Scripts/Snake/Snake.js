// Snake.js - Component chính
import { SNAKE_CONFIG } from "./SnakeConstants";
import { SnakeUtils } from "./SnakeUtils";
import { SnakeSegment } from "./SnakeSegment";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  @property(cc.SpriteFrame)
  snakeHeadSprite = null; // Kéo sprite đầu rắn vào đây

  @property(cc.SpriteFrame)
  snakeBodySprite = null; // Kéo sprite thân rắn vào đây

  @property(cc.SpriteFrame)
  snakeTailSprite = null; // Kéo sprite đuôi rắn vào đây

  // Thuộc tính cơ bản
  playerId = null;
  playerData = null;
  segments = [];
  previousHeadPosition = null;

  // Getter để lấy sprites
  get sprites() {
    return {
      head: this.snakeHeadSprite,
      body: this.snakeBodySprite,
      tail: this.snakeTailSprite,
    };
  }

  // Khởi tạo rắn với dữ liệu player
  initializeSnake(playerData) {
    this.playerId = playerData.id;
    this.playerData = playerData;
    this.clearSegments();
    this.createSnakeBody(playerData);

    // Lưu vị trí đầu ban đầu
    if (playerData.body?.length > 0) {
      this.previousHeadPosition = { ...playerData.body[0] };
    }
  }

  // Cập nhật rắn với dữ liệu mới
  updateSnake(playerData) {
    if (!playerData?.alive) {
      this.node.active = false;
      return;
    }

    this.playerData = playerData;
    this.node.active = true;
    this.updateSnakeBody(playerData);
  }

  // Tạo thân rắn từ dữ liệu player
  createSnakeBody(playerData) {
    if (!playerData.body?.length) return;

    // Tạo thân rắn từ cuối lên đầu (để đầu hiển thị trên cùng)
    for (let i = playerData.body.length - 1; i >= 0; i--) {
      const segment = SnakeSegment.createSegment(
        this.node,
        playerData.body[i],
        i,
        playerData.body.length,
        this.sprites,
        this.playerId,
        playerData
      );
      this.segments.push(segment);
    }
  }

  // Cập nhật thân rắn
  updateSnakeBody(playerData) {
    if (!playerData.body?.length) return;

    this.clearSegments();

    // Tạo thân rắn từ cuối lên đầu
    for (let i = playerData.body.length - 1; i >= 0; i--) {
      const segment = SnakeSegment.createSegment(
        this.node,
        playerData.body[i],
        i,
        playerData.body.length,
        this.sprites,
        this.playerId,
        playerData
      );
      this.segments.push(segment);
    }

    // Cập nhật hướng của đầu rắn
    if (playerData.body.length > 0) {
      SnakeSegment.updateHeadDirection(
        this.segments,
        playerData.body[0],
        this.previousHeadPosition
      );
      this.previousHeadPosition = { ...playerData.body[0] };
    }

    // Cập nhật hướng của đuôi rắn
    if (playerData.body.length > 1) {
      SnakeSegment.updateTailDirection(this.segments, playerData.body);
    }
  }

  // Xóa tất cả segments
  clearSegments() {
    SnakeUtils.clearSegments(this.segments, this.node);
  }

  // Cleanup khi component bị hủy
  onDestroy() {
    try {
      this.clearSegments();
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset tất cả thuộc tính
    this.segments = null;
    this.playerId = null;
    this.playerData = null;
    this.previousHeadPosition = null;
  }
}
