// SnakeSegment.js - Quản lý từng segment của rắn
import { SNAKE_CONFIG } from "./SnakeConstants";
import { SnakeUtils } from "./SnakeUtils";

export class SnakeSegment {
  // Tạo một segment mới
  static createSegment(
    parentNode,
    segmentData,
    index,
    totalLength,
    sprites,
    playerId,
    playerData
  ) {
    const segmentNode = new cc.Node(`Segment_${index}`);
    segmentNode.parent = parentNode;

    const isHead = index === 0;
    const isTail = index === totalLength - 1 && totalLength > 1;

    // Thiết lập sprite và z-index
    SnakeSegment.setupSegmentSprite(segmentNode, isHead, isTail, sprites);

    // Thiết lập màu sắc
    segmentNode.color = SnakeUtils.getPlayerColor(playerId);

    // Thiết lập kích thước
    SnakeSegment.setupSegmentSize(segmentNode, isHead, isTail);

    // Thiết lập vị trí
    const worldPos = SnakeUtils.gridToWorldPosition(
      segmentData,
      isHead,
      index,
      playerData
    );
    segmentNode.setPosition(worldPos.x, worldPos.y);

    return segmentNode;
  }

  // Thiết lập sprite cho segment
  static setupSegmentSprite(segmentNode, isHead, isTail, sprites) {
    if (isHead && sprites.head) {
      // Tạo đầu rắn
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = sprites.head;
      segmentNode.zIndex = SNAKE_CONFIG.Z_INDEX.HEAD;
    } else if (isTail && sprites.tail) {
      // Tạo đuôi rắn
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = sprites.tail;
      segmentNode.zIndex = SNAKE_CONFIG.Z_INDEX.TAIL;
    } else {
      // Tạo thân rắn
      SnakeSegment.setupBodySprite(segmentNode, sprites.body);
      segmentNode.zIndex = SNAKE_CONFIG.Z_INDEX.BODY;
    }
  }

  // Thiết lập sprite cho thân rắn
  static setupBodySprite(segmentNode, bodySprite) {
    if (bodySprite) {
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = bodySprite;
    } else {
      // Fallback: tạo SpriteFrame từ canvas
      const spriteFrame = SnakeUtils.createBodySpriteFrame();
      if (spriteFrame) {
        const sprite = segmentNode.addComponent(cc.Sprite);
        sprite.spriteFrame = spriteFrame;
      } else {
        // Fallback cuối cùng: sử dụng graphics
        SnakeSegment.createGraphicsBody(segmentNode);
      }
    }
  }

  // Tạo thân rắn bằng graphics
  static createGraphicsBody(segmentNode) {
    const graphics = segmentNode.addComponent(cc.Graphics);
    graphics.fillColor = cc.Color.WHITE;

    const bodySize = SNAKE_CONFIG.GRID_SIZE * SNAKE_CONFIG.BODY_SIZE_RATIO;
    graphics.rect(-bodySize / 2, -bodySize / 2, bodySize, bodySize);
    graphics.fill();
  }

  // Thiết lập kích thước segment
  static setupSegmentSize(segmentNode, isHead, isTail) {
    const { GRID_SIZE, HEAD_SIZE_RATIO, BODY_SIZE_RATIO, TAIL_SIZE_RATIO } =
      SNAKE_CONFIG;

    if (isHead) {
      segmentNode.width = GRID_SIZE * HEAD_SIZE_RATIO;
      segmentNode.height = GRID_SIZE * HEAD_SIZE_RATIO;
    } else if (isTail) {
      const tailSize = GRID_SIZE * TAIL_SIZE_RATIO;
      segmentNode.width = tailSize;
      segmentNode.height = tailSize;
    } else {
      const bodySize = GRID_SIZE * BODY_SIZE_RATIO;
      segmentNode.width = bodySize;
      segmentNode.height = bodySize;
    }
  }

  // Cập nhật hướng của đầu rắn
  static updateHeadDirection(segments, currentHeadPos, previousHeadPos) {
    if (!previousHeadPos || !segments.length) return;

    const headNode = segments.find(
      (segment) => segment.zIndex === SNAKE_CONFIG.Z_INDEX.HEAD
    );
    if (!headNode) return;

    const angle = SnakeUtils.calculateDirection(
      currentHeadPos,
      previousHeadPos
    );
    headNode.angle = angle;
  }

  // Cập nhật hướng của đuôi rắn
  static updateTailDirection(segments, bodyArray) {
    if (bodyArray.length < 2) return;

    const tailNode = segments.find(
      (segment) => segment.zIndex === SNAKE_CONFIG.Z_INDEX.TAIL
    );
    if (!tailNode) return;

    // Lấy vị trí 2 segment cuối để tính hướng đuôi
    const tailPos = bodyArray[bodyArray.length - 1];
    const beforeTailPos = bodyArray[bodyArray.length - 2];

    const angle = SnakeUtils.calculateDirection(tailPos, beforeTailPos);
    tailNode.angle = angle;
  }
}
