import { SNAKE_CONFIG } from "./SnakeConstants";
import { SnakeUtils } from "./SnakeUtils";
import { SnakeSegment } from "./SnakeSegment";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  @property(cc.SpriteFrame)
  snakeHeadSprite = null; 
  @property(cc.SpriteFrame)
  snakeBodySprite = null; 

  @property(cc.SpriteFrame)
  snakeTailSprite = null; 


  playerId = null;
  playerData = null;
  segments = [];
  previousHeadPosition = null;


  get sprites() {
    return {
      head: this.snakeHeadSprite,
      body: this.snakeBodySprite,
      tail: this.snakeTailSprite,
    };
  }


  initializeSnake(playerData) {
    this.playerId = playerData.id;
    this.playerData = playerData;
    this.clearSegments();
    this.createSnakeBody(playerData);


    if (playerData.body?.length > 0) {
      this.previousHeadPosition = { ...playerData.body[0] };
    }
  }

  updateSnake(playerData) {
    if (!playerData?.alive) {
      this.node.active = false;
      return;
    }

    this.playerData = playerData;
    this.node.active = true;
    this.updateSnakeBody(playerData);
  }


  createSnakeBody(playerData) {
    if (!playerData.body?.length) return;


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


  updateSnakeBody(playerData) {
    if (!playerData.body?.length) return;

    this.clearSegments();


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


    if (playerData.body.length > 0) {
      SnakeSegment.updateHeadDirection(
        this.segments,
        playerData.body[0],
        this.previousHeadPosition
      );
      this.previousHeadPosition = { ...playerData.body[0] };
    }


    if (playerData.body.length > 1) {
      SnakeSegment.updateTailDirection(this.segments, playerData.body);
    }
  }

  clearSegments() {
    SnakeUtils.clearSegments(this.segments, this.node);
  }

  onDestroy() {
    try {
      this.clearSegments();
    } catch (error) {
      
    }

    this.segments = null;
    this.playerId = null;
    this.playerData = null;
    this.previousHeadPosition = null;
  }
}
