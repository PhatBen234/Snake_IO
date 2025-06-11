// SnakeUtils.js - Các hàm tiện ích
import { SNAKE_CONFIG, NEON_COLORS } from "./SnakeConstants";

export class SnakeUtils {
  // Lưu trữ màu đã được sử dụng
  static usedColors = new Set();
  static playerColorMap = new Map(); // Map playerId -> colorIndex

  // Chuyển đổi từ grid position sang world position
  static gridToWorldPosition(
    gridPos,
    isHead = false,
    segmentIndex = 0,
    playerData = null
  ) {
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = SNAKE_CONFIG;

    let worldX = gridPos.x - CANVAS_WIDTH / 2;
    let worldY = CANVAS_HEIGHT / 2 - gridPos.y;

    // Chỉ điều chỉnh vị trí cho segment thân đầu tiên để không trùng với đầu
    if (!isHead && segmentIndex === 1 && playerData?.body?.length >= 2) {
      const headSegment = playerData.body[0];
      const firstBodySegment = playerData.body[1];

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

  // Tính góc xoay dựa trên hướng di chuyển
  static calculateDirection(currentPos, previousPos) {
    const deltaX = currentPos.x - previousPos.x;
    const deltaY = currentPos.y - previousPos.y;

    if (deltaX > 0) {
      return SNAKE_CONFIG.DIRECTIONS.RIGHT.angle;
    } else if (deltaX < 0) {
      return SNAKE_CONFIG.DIRECTIONS.LEFT.angle;
    } else if (deltaY > 0) {
      return SNAKE_CONFIG.DIRECTIONS.UP.angle;
    } else if (deltaY < 0) {
      return SNAKE_CONFIG.DIRECTIONS.DOWN.angle;
    }

    return 0;
  }

  // Tạo màu cho player - Tránh trùng màu
  static getPlayerColor(playerId) {
    // Nếu player đã có màu, trả về màu đã lưu
    if (SnakeUtils.playerColorMap.has(playerId)) {
      const colorIndex = SnakeUtils.playerColorMap.get(playerId);
      return NEON_COLORS[colorIndex];
    }

    // Tìm màu chưa được sử dụng
    let colorIndex = SnakeUtils.findAvailableColorIndex(playerId);

    // Nếu tất cả màu đã được sử dụng, reset và bắt đầu lại
    if (colorIndex === -1) {
      SnakeUtils.resetColorUsage();
      colorIndex = SnakeUtils.findAvailableColorIndex(playerId);
    }

    // Lưu màu cho player
    SnakeUtils.playerColorMap.set(playerId, colorIndex);
    SnakeUtils.usedColors.add(colorIndex);

    return NEON_COLORS[colorIndex];
  }

  // Tìm màu có sẵn
  static findAvailableColorIndex(playerId) {
    // Thử hash trước
    const hash = SnakeUtils.hashString(playerId);
    let preferredIndex = Math.abs(hash) % NEON_COLORS.length;

    if (!SnakeUtils.usedColors.has(preferredIndex)) {
      return preferredIndex;
    }

    // Nếu màu hash bị trùng, tìm màu tiếp theo có sẵn
    for (let i = 0; i < NEON_COLORS.length; i++) {
      if (!SnakeUtils.usedColors.has(i)) {
        return i;
      }
    }

    return -1; // Không có màu nào có sẵn
  }

  // Reset việc sử dụng màu (khi có quá nhiều player)
  static resetColorUsage() {
    SnakeUtils.usedColors.clear();
    // Giữ lại mapping cho các player hiện tại
    // Chỉ clear usedColors để cho phép tái sử dụng màu
  }

  // Xóa màu của player khi họ rời khỏi game
  static removePlayerColor(playerId) {
    if (SnakeUtils.playerColorMap.has(playerId)) {
      const colorIndex = SnakeUtils.playerColorMap.get(playerId);
      SnakeUtils.usedColors.delete(colorIndex);
      SnakeUtils.playerColorMap.delete(playerId);
    }
  }

  // Hash string để tạo màu duy nhất
  static hashString(str) {
    if (!str) return 0;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  // Tạo SpriteFrame cho thân rắn từ canvas
  static createBodySpriteFrame() {
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

  // Xóa an toàn các segments
  static clearSegments(segments, parentNode) {
    if (!segments?.length) return;

    segments.forEach((segment) => {
      if (segment && cc.isValid(segment)) {
        segment.destroy();
      }
    });

    segments.length = 0;

    if (parentNode && cc.isValid(parentNode) && parentNode.children) {
      parentNode.removeAllChildren();
    }
  }
}
