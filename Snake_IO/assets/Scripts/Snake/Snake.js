const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  @property(cc.SpriteFrame)
  snakeHeadSprite = null; // Kéo sprite đầu rắn vào đây

  @property(cc.SpriteFrame)
  snakeBodySprite = null; // Kéo sprite thân rắn vào đây

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

    // Tạo thân rắn trước (để đầu hiển thị trên cùng)
    for (let i = playerData.body.length - 1; i >= 0; i--) {
      this.createSegment(playerData.body[i], i);
    }
  }

  updateSnakeBody(playerData) {
    if (!playerData.body?.length) return;

    this.clearSegments();

    // Tạo thân rắn trước (để đầu hiển thị trên cùng)
    for (let i = playerData.body.length - 1; i >= 0; i--) {
      this.createSegment(playerData.body[i], i);
    }

    // Cập nhật hướng của đầu rắn
    if (playerData.body.length > 0) {
      this.updateHeadDirection(playerData.body[0]);
      this.previousHeadPosition = { ...playerData.body[0] };
    }
  }

  createSegment(segmentData, index) {
    const segmentNode = new cc.Node(`Segment_${index}`);
    segmentNode.parent = this.node;

    const isHead = index === 0;

    if (isHead && this.snakeHeadSprite) {
      // Sử dụng sprite đầu rắn có sẵn
      const sprite = segmentNode.addComponent(cc.Sprite);
      sprite.spriteFrame = this.snakeHeadSprite;
      // Set zIndex cao hơn để đầu luôn hiển thị trên cùng
      segmentNode.zIndex = 100;
    } else {
      // Sử dụng sprite thân rắn hoặc fallback
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
          const bodySize = this.gridSize * 0.7; // Giảm 30% so với đầu
          graphics.rect(-bodySize / 2, -bodySize / 2, bodySize, bodySize);
          graphics.fill();
        }
      }
      // Set zIndex thấp hơn cho thân
      segmentNode.zIndex = 10;
    }

    // Set màu sắc
    segmentNode.color = this.getPlayerColor(this.playerId, isHead);

    // Set kích thước khác nhau cho đầu và thân
    if (isHead) {
      segmentNode.width = this.gridSize;
      segmentNode.height = this.gridSize;
    } else {
      // Thu nhỏ thân rắn
      const bodySize = this.gridSize * 0.7; // Giảm 30% so với đầu
      segmentNode.width = bodySize;
      segmentNode.height = bodySize;
    }

    // Set vị trí - điều chỉnh vị trí thân để không trùng với đầu
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
    // Sprite gốc hướng lên (Y dương), nên cần điều chỉnh góc
    let angle = 0;

    if (deltaX > 0) {
      // Di chuyển qua phải - xoay 90° từ hướng lên
      angle = 90;
    } else if (deltaX < 0) {
      // Di chuyển qua trái - xoay -90° từ hướng lên
      angle = -90;
    } else if (deltaY > 0) {
      // Di chuyển lên trên - giữ nguyên (sprite gốc)
      angle = 0;
    } else if (deltaY < 0) {
      // Di chuyển xuống dưới - xoay 180° từ hướng lên
      angle = 180;
    }

    // Áp dụng góc xoay cho đầu rắn
    headNode.angle = angle;
  }

  gridToWorldPosition(gridPos, isHead = false, segmentIndex = 0) {
    const canvasWidth = 960;
    const canvasHeight = 640;

    let worldX = gridPos.x - canvasWidth / 2;
    let worldY = canvasHeight / 2 - gridPos.y;

    // Chỉ điều chỉnh vị trí cho segment thân đầu tiên (index = 1) để không trùng với đầu
    // Các segment khác giữ nguyên vị trí để tránh bị lệch ở khúc cua
    if (!isHead && segmentIndex === 1) {
      // Tính hướng di chuyển từ đầu rắn đến segment đầu tiên
      const headSegment = this.playerData.body[0];
      const firstBodySegment = this.playerData.body[1];

      if (headSegment && firstBodySegment) {
        const deltaX = headSegment.x - firstBodySegment.x;
        const deltaY = headSegment.y - firstBodySegment.y;

        // Dịch chuyển segment thân đầu tiên theo hướng ngược lại với hướng di chuyển
        if (deltaX > 0) {
          // Đầu đi qua phải, dịch thân qua trái một chút
          worldX -= 2;
        } else if (deltaX < 0) {
          // Đầu đi qua trái, dịch thân qua phải một chút
          worldX += 2;
        } else if (deltaY > 0) {
          // Đầu đi lên, dịch thân xuống một chút
          worldY -= 2;
        } else if (deltaY < 0) {
          // Đầu đi xuống, dịch thân lên một chút
          worldY += 2;
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
      // Giảm bán kính từ 14 xuống 10 để thu nhỏ thân
      ctx.arc(16, 16, 10, 0, 2 * Math.PI);
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
    const colors = [
      cc.Color.WHITE, // Trắng - rất nổi bật
      cc.Color.YELLOW, // Vàng - sáng và dễ nhìn
      new cc.Color(255, 165, 0, 255), // Cam sáng
      new cc.Color(0, 255, 127, 255), // Xanh lá sáng
      new cc.Color(255, 20, 147, 255), // Hồng sáng
      new cc.Color(0, 191, 255, 255), // Xanh dương sáng
      new cc.Color(50, 205, 50, 255), // Xanh limegreen
      new cc.Color(255, 69, 0, 255), // Đỏ cam sáng
    ];

    const hash = this.hashString(playerId);
    const baseColor = colors[Math.abs(hash) % colors.length];

    // Thân và đầu cùng màu
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
