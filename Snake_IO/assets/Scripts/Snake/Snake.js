const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  playerId = null;
  playerData = null;
  segments = [];
  gridSize = 20;

  initializeSnake(playerData) {
    this.playerId = playerData.id;
    this.playerData = playerData;
    this.clearSegments();
    this.createSnakeBody(playerData);
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

    playerData.body.forEach((segment, index) => {
      this.createSegment(segment, index);
    });
  }

  updateSnakeBody(playerData) {
    if (!playerData.body?.length) return;

    this.clearSegments();
    playerData.body.forEach((segment, index) => {
      this.createSegment(segment, index);
    });
  }

  createSegment(segmentData, index) {
    const segmentNode = new cc.Node(`Segment_${index}`);
    segmentNode.parent = this.node;

    // Try to add sprite, fallback to graphics
    const spriteFrame = this.createSpriteFrame();
    if (spriteFrame) {
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = spriteFrame;
    } else {
      const graphics = segmentNode.addComponent(cc.Graphics);
      graphics.fillColor = cc.Color.WHITE;
      graphics.rect(
        -this.gridSize / 2,
        -this.gridSize / 2,
        this.gridSize,
        this.gridSize
      );
      graphics.fill();
    }

    // Set appearance
    const isHead = index === 0;
    segmentNode.color = this.getPlayerColor(this.playerId, isHead);
    segmentNode.width = this.gridSize;
    segmentNode.height = this.gridSize;

    // Set position
    const worldPos = this.gridToWorldPosition(segmentData);
    segmentNode.setPosition(worldPos.x, worldPos.y);

    this.segments.push(segmentNode);
  }

  gridToWorldPosition(gridPos) {
    const canvasWidth = 960;
    const canvasHeight = 640;

    const worldX = gridPos.x - canvasWidth / 2;
    const worldY = canvasHeight / 2 - gridPos.y;

    return { x: worldX, y: worldY };
  }

  createSpriteFrame() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 32, 32);

      const img = new Image();
      img.src = canvas.toDataURL();

      const texture = new cc.Texture2D();
      texture.initWithElement(img);

      const spriteFrame = new cc.SpriteFrame();
      spriteFrame.setTexture(texture);

      return spriteFrame;
    } catch (error) {
      return null;
    }
  }

  clearSegments() {
    if (!this.segments?.length) return;

    this.segments.forEach((segment) => {
      if (segment && cc.isValid(segment)) {
        segment.destroy();
      }
    });

    this.segments = [];

    if (this.node && cc.isValid(this.node) && this.node.children) {
      this.node.removeAllChildren();
    }
  }

  getPlayerColor(playerId, isHead = true) {
    const colors = [
      cc.Color.GREEN,
      cc.Color.BLUE,
      cc.Color.YELLOW,
      cc.Color.MAGENTA,
      cc.Color.CYAN,
      cc.Color.ORANGE,
    ];

    const hash = this.hashString(playerId);
    const baseColor = colors[Math.abs(hash) % colors.length];

    return isHead
      ? baseColor
      : new cc.Color(
          Math.floor(baseColor.r * 0.7),
          Math.floor(baseColor.g * 0.7),
          Math.floor(baseColor.b * 0.7),
          255
        );
  }

  hashString(str) {
    if (!str) return 0;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  onDestroy() {
    try {
      if (this.segments?.length) {
        this.segments.forEach((segment) => {
          if (segment && cc.isValid(segment)) {
            segment.destroy();
          }
        });
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    this.segments = null;
    this.playerId = null;
    this.playerData = null;
  }
}
