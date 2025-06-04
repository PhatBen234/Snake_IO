const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  // Snake data
  playerId = null;
  playerData = null;
  bodySegments = [];
  gridSize = 20;

  onLoad() {
    console.log("🐍 Snake component loaded");
  }

  start() {
    console.log("🐍 Snake component started");
  }

  // Khởi tạo snake với dữ liệu từ server
  initSnake(playerId, playerData) {
    this.playerId = playerId;
    this.playerData = playerData;

    console.log(`🐍 Initializing snake for player: ${playerId}`, playerData);

    // Cập nhật vị trí và body
    this.updateSnake(playerData);
  }

  // Cập nhật snake với dữ liệu mới
  updateSnake(playerData) {
    if (!playerData || !playerData.body || playerData.body.length === 0) {
      console.warn("❌ Invalid player data for snake update");
      return;
    }

    this.playerData = playerData;
    console.log(
      `🔄 Updating snake ${this.playerId} with ${playerData.body.length} segments`
    );

    // Xóa các segment cũ
    this.clearBodySegments();

    // Tạo segments mới
    this.createBodySegments(playerData.body);

    // Cập nhật trạng thái hiển thị
    this.updateVisibility(playerData.alive);
  }

  // Tạo tất cả segments của snake
  createBodySegments(bodyArray) {
    bodyArray.forEach((segment, index) => {
      const segmentNode = new cc.Node(`Segment_${index}`);
      segmentNode.parent = this.node;

      // Add sprite component
      const sprite = segmentNode.addComponent(cc.Sprite);

      // Set size
      segmentNode.width = this.gridSize;
      segmentNode.height = this.gridSize;

      // Set màu sắc
      const isHead = index === 0;
      const isTail = index === bodyArray.length - 1;

      if (isHead) {
        segmentNode.color = this.getPlayerHeadColor(this.playerId);
      } else if (isTail) {
        segmentNode.color = this.getTailColor();
      } else {
        segmentNode.color = this.getBodyColor();
      }

      // Set position
      const screenPos = this.gameToScreenPosition(segment);
      segmentNode.setPosition(screenPos.x, screenPos.y);

      // Lưu reference
      this.bodySegments.push(segmentNode);

      console.log(`🟢 Created segment ${index} at position:`, screenPos);
    });
  }

  // Xóa tất cả body segments
  clearBodySegments() {
    this.bodySegments.forEach((segment) => {
      if (segment && segment.isValid) {
        segment.destroy();
      }
    });
    this.bodySegments = [];
  }

  // Lấy màu head theo player ID
  getPlayerHeadColor(playerId) {
    const colors = [
      cc.Color.GREEN,
      cc.Color.BLUE,
      cc.Color.YELLOW,
      cc.Color.MAGENTA,
      cc.Color.CYAN,
      cc.Color.WHITE,
    ];
    const hash = this.hashCode(playerId);
    return colors[Math.abs(hash) % colors.length];
  }

  // Lấy màu body (nhạt hơn head)
  getBodyColor() {
    const headColor = this.getPlayerHeadColor(this.playerId);
    return new cc.Color(
      headColor.r * 0.7,
      headColor.g * 0.7,
      headColor.b * 0.7
    );
  }

  // Lấy màu tail (tối hơn body)
  getTailColor() {
    const headColor = this.getPlayerHeadColor(this.playerId);
    return new cc.Color(
      headColor.r * 0.5,
      headColor.g * 0.5,
      headColor.b * 0.5
    );
  }

  // Convert game coordinates to screen coordinates
  gameToScreenPosition(gamePos) {
    const gameAreaWidth = 800;
    const gameAreaHeight = 600;

    const screenX = gamePos.x - gameAreaWidth / 2;
    const screenY = gameAreaHeight / 2 - gamePos.y;

    return { x: screenX, y: screenY };
  }

  // Cập nhật trạng thái hiển thị
  updateVisibility(isAlive) {
    this.node.active = isAlive;

    if (!isAlive) {
      console.log(`💀 Snake ${this.playerId} died`);
    }
  }

  // Hash function để tạo màu sắc unique
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Cleanup khi destroy
  onDestroy() {
    console.log(`🧹 Destroying snake: ${this.playerId}`);
    this.clearBodySegments();
  }
}
