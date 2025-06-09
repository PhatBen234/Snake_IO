const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  @property(cc.SpriteFrame)
  snakeHeadSprite = null; // Kéo sprite đầu rắn vào đây

  @property(cc.SpriteFrame)
  snakeBodySprite = null; // Kéo sprite thân rắn vào đây

  @property(cc.SpriteFrame)
  snakeTailSprite = null; // Kéo sprite đuôi rắn vào đây

  playerId = null;
  playerData = null;
  segments = [];
  gridSize = 20;
  previousHeadPosition = null; // Để tính hướng di chuyển

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

    // Tạo thân rắn từ cuối lên đầu (để đầu hiển thị trên cùng)
    for (let i = playerData.body.length - 1; i >= 0; i--) {
      this.createSegment(playerData.body[i], i, playerData.body.length);
    }
  }

  updateSnakeBody(playerData) {
    if (!playerData.body?.length) return;

    this.clearSegments();

    // Tạo thân rắn từ cuối lên đầu (để đầu hiển thị trên cùng)
    for (let i = playerData.body.length - 1; i >= 0; i--) {
      this.createSegment(playerData.body[i], i, playerData.body.length);
    }

    // Cập nhật hướng của đầu rắn
    if (playerData.body.length > 0) {
      this.updateHeadDirection(playerData.body[0]);
      this.previousHeadPosition = { ...playerData.body[0] };
    }

    // Cập nhật hướng của đuôi rắn
    if (playerData.body.length > 1) {
      this.updateTailDirection(playerData.body);
    }
  }

  createSegment(segmentData, index, totalLength) {
    const segmentNode = new cc.Node(`Segment_${index}`);
    segmentNode.parent = this.node;

    const isHead = index === 0;
    const isTail = index === totalLength - 1 && totalLength > 1; // Chỉ là đuôi khi có ít nhất 2 segment

    if (isHead && this.snakeHeadSprite) {
      // Tạo đầu rắn
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = this.snakeHeadSprite;
      segmentNode.zIndex = 100;
    } else if (isTail && this.snakeTailSprite) {
      // Tạo đuôi rắn
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = this.snakeTailSprite;
      segmentNode.zIndex = 5; // Thấp hơn thân nhưng cao hơn background
    } else {
      // Tạo thân rắn (hoặc segment duy nhất nếu chỉ có 1 segment)
      if (this.snakeBodySprite) {
        const sprite = segmentNode.addComponent(cc.Sprite);
        sprite.spriteFrame = this.snakeBodySprite;
      } else {
        // Fallback: tạo SpriteFrame từ canvas
        const spriteFrame = this.createBodySpriteFrame();
        if (spriteFrame) {
          const sprite = segmentNode.addComponent(cc.Sprite);
          sprite.spriteFrame = spriteFrame;
        } else {
          // Fallback cuối cùng: sử dụng graphics
          const graphics = segmentNode.addComponent(cc.Graphics);
          graphics.fillColor = cc.Color.WHITE;
          // Thu nhỏ kích thước thân rắn
          const bodySize = this.gridSize * 0.7;
          graphics.rect(-bodySize / 2, -bodySize / 2, bodySize, bodySize);
          graphics.fill();
        }
      }
      segmentNode.zIndex = 10;
    }

    // Set màu sắc
    segmentNode.color = this.getPlayerColor(this.playerId, isHead);

    // Set kích thước
    if (isHead) {
      segmentNode.width = this.gridSize;
      segmentNode.height = this.gridSize;
    } else if (isTail) {
      // Đuôi có thể nhỏ hơn đầu một chút
      const tailSize = this.gridSize * 0.8;
      segmentNode.width = tailSize;
      segmentNode.height = tailSize;
    } else {
      // Thân rắn nhỏ hơn đầu
      const bodySize = this.gridSize * 0.7;
      segmentNode.width = bodySize;
      segmentNode.height = bodySize;
    }

    // Set vị trí
    const worldPos = this.gridToWorldPosition(segmentData, isHead, index);
    segmentNode.setPosition(worldPos.x, worldPos.y);

    this.segments.push(segmentNode);
  }

  updateHeadDirection(currentHeadPos) {
    if (!this.previousHeadPosition || !this.segments.length) return;

    // Tìm node đầu rắn (có zIndex = 100)
    const headNode = this.segments.find((segment) => segment.zIndex === 100);
    if (!headNode) return;

    // Tính vector hướng di chuyển
    const deltaX = currentHeadPos.x - this.previousHeadPosition.x;
    const deltaY = currentHeadPos.y - this.previousHeadPosition.y;

    // Tính góc xoay dựa trên hướng di chuyển
    let angle = 0;

    if (deltaX > 0) {
      angle = 90; // Qua phải
    } else if (deltaX < 0) {
      angle = -90; // Qua trái
    } else if (deltaY > 0) {
      angle = 0; // Lên trên
    } else if (deltaY < 0) {
      angle = 180; // Xuống dưới
    }

    headNode.angle = angle;
  }

  updateTailDirection(bodyArray) {
    if (bodyArray.length < 2) return;

    // Tìm node đuôi rắn (có zIndex = 5)
    const tailNode = this.segments.find((segment) => segment.zIndex === 5);
    if (!tailNode) return;

    // Lấy vị trí 2 segment cuối để tính hướng đuôi
    const tailPos = bodyArray[bodyArray.length - 1]; // Vị trí đuôi
    const beforeTailPos = bodyArray[bodyArray.length - 2]; // Vị trí segment trước đuôi

    // Tính vector hướng từ segment trước đuôi đến đuôi
    const deltaX = tailPos.x - beforeTailPos.x;
    const deltaY = tailPos.y - beforeTailPos.y;

    // Tính góc xoay cho đuôi (đuôi hướng theo hướng di chuyển)
    let angle = 0;

    if (deltaX > 0) {
      angle = 90; // Đuôi hướng qua phải
    } else if (deltaX < 0) {
      angle = -90; // Đuôi hướng qua trái
    } else if (deltaY > 0) {
      angle = 0; // Đuôi hướng lên trên
    } else if (deltaY < 0) {
      angle = 180; // Đuôi hướng xuống dưới
    }

    tailNode.angle = angle;
  }

  gridToWorldPosition(gridPos, isHead = false, segmentIndex = 0) {
    const canvasWidth = 960;
    const canvasHeight = 640;

    let worldX = gridPos.x - canvasWidth / 2;
    let worldY = canvasHeight / 2 - gridPos.y;

    // Chỉ điều chỉnh vị trí cho segment thân đầu tiên để không trùng với đầu
    if (!isHead && segmentIndex === 1) {
      // Tính hướng di chuyển từ đầu rắn đến segment đầu tiên
      const headSegment = this.playerData.body[0];
      const firstBodySegment = this.playerData.body[1];

      if (headSegment && firstBodySegment) {
        const deltaX = headSegment.x - firstBodySegment.x;
        const deltaY = headSegment.y - firstBodySegment.y;

        // Dịch chuyển segment thân đầu tiên theo hướng ngược lại
        if (deltaX > 0) {
          worldX -= 2; // Đầu đi qua phải, dịch thân qua trái
        } else if (deltaX < 0) {
          worldX += 2; // Đầu đi qua trái, dịch thân qua phải
        } else if (deltaY > 0) {
          worldY -= 2; // Đầu đi lên, dịch thân xuống
        } else if (deltaY < 0) {
          worldY += 2; // Đầu đi xuống, dịch thân lên
        }
      }
    }

    return { x: worldX, y: worldY };
  }

  createBodySpriteFrame() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext("2d");

      // Tạo hình tròn nhỏ hơn cho thân rắn
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(16, 16, 10, 0, 2 * Math.PI); // Bán kính 10px
      ctx.fill();

      const img = new Image();
      img.src = canvas.toDataURL();

      const texture = new cc.Texture2D();
      texture.initWithElement(img);

      const spriteFrame = new cc.SpriteFrame();
      spriteFrame.setTexture(texture);

      return spriteFrame;
    } catch (error) {
      console.error("Không thể tạo body sprite frame:", error);
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
    // Màu neon sáng để nổi bật trên nền tối
    const neonColors = [
      new cc.Color(0, 255, 255, 255), // Cyan neon (#00FFFF)
      new cc.Color(255, 0, 255, 255), // Magenta neon (#FF00FF)
      new cc.Color(255, 255, 0, 255), // Yellow neon (#FFFF00)
      new cc.Color(255, 20, 147, 255), // Deep pink neon (#FF1493)
      new cc.Color(255, 69, 0, 255), // Orange red neon (#FF4500)
      new cc.Color(255, 105, 180, 255), // Hot pink neon (#FF69B4)
      new cc.Color(255, 215, 0, 255), // Gold neon (#FFD700)
      new cc.Color(138, 43, 226, 255), // Blue violet neon (#8A2BE2)
      new cc.Color(255, 140, 0, 255), // Dark orange neon (#FF8C00)
      new cc.Color(255, 20, 20, 255), // Bright red neon (#FF1414)
      new cc.Color(0, 191, 255, 255), // Deep sky blue neon (#00BFFF)
      new cc.Color(255, 255, 255, 255), // Pure white neon (#FFFFFF)
    ];

    const hash = this.hashString(playerId);
    const baseColor = neonColors[Math.abs(hash) % neonColors.length];

    return baseColor;
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
    this.previousHeadPosition = null;
  }
}
