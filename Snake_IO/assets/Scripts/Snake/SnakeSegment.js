import { SNAKE_CONFIG } from "./SnakeConstants";
import { SnakeUtils } from "./SnakeUtils";

export class SnakeSegment {
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


    SnakeSegment.setupSegmentSprite(segmentNode, isHead, isTail, sprites);


    segmentNode.color = SnakeUtils.getPlayerColor(playerId);


    SnakeSegment.setupSegmentSize(segmentNode, isHead, isTail);


    const worldPos = SnakeUtils.gridToWorldPosition(
      segmentData,
      isHead,
      index,
      playerData
    );
    segmentNode.setPosition(worldPos.x, worldPos.y);

    return segmentNode;
  }


  static setupSegmentSprite(segmentNode, isHead, isTail, sprites) {
    if (isHead && sprites.head) {

      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = sprites.head;
      segmentNode.zIndex = SNAKE_CONFIG.Z_INDEX.HEAD;
    } else if (isTail && sprites.tail) {

      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = sprites.tail;
      segmentNode.zIndex = SNAKE_CONFIG.Z_INDEX.TAIL;
    } else {
      
      SnakeSegment.setupBodySprite(segmentNode, sprites.body);
      segmentNode.zIndex = SNAKE_CONFIG.Z_INDEX.BODY;
    }
  }

  
  static setupBodySprite(segmentNode, bodySprite) {
    if (bodySprite) {
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = bodySprite;
    } else {
      const spriteFrame = SnakeUtils.createBodySpriteFrame();
      if (spriteFrame) {
        const sprite = segmentNode.addComponent(cc.Sprite);
        sprite.spriteFrame = spriteFrame;
      } else {
        SnakeSegment.createGraphicsBody(segmentNode);
      }
    }
  }

  static createGraphicsBody(segmentNode) {
    const graphics = segmentNode.addComponent(cc.Graphics);
    graphics.fillColor = cc.Color.WHITE;

    const bodySize = SNAKE_CONFIG.GRID_SIZE * SNAKE_CONFIG.BODY_SIZE_RATIO;
    graphics.rect(-bodySize / 2, -bodySize / 2, bodySize, bodySize);
    graphics.fill();
  }

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

  static updateTailDirection(segments, bodyArray) {
    if (bodyArray.length < 2) return;

    const tailNode = segments.find(
      (segment) => segment.zIndex === SNAKE_CONFIG.Z_INDEX.TAIL
    );
    if (!tailNode) return;

    const tailPos = bodyArray[bodyArray.length - 1];
    const beforeTailPos = bodyArray[bodyArray.length - 2];

    const angle = SnakeUtils.calculateDirection(tailPos, beforeTailPos);
    tailNode.angle = angle;
  }
}
