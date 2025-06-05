const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  // Player info
  playerId = null;
  playerData = null;

  // Snake segments
  segments = [];
  gridSize = 20;

  start() {
    console.log("🐍 Snake component started");
  }

  // Initialize snake with player data
  initializeSnake(playerData) {
    console.log("🐍 Initializing snake for player:", playerData.id);

    this.playerId = playerData.id;
    this.playerData = playerData;

    // Clear existing segments
    this.clearSegments();

    // Create snake body based on player data
    this.createSnakeBody(playerData);
  }

  // Update snake with new player data
  updateSnake(playerData) {
    if (!playerData || !playerData.alive) {
      console.log("🐍 Player not alive, hiding snake");
      this.node.active = false;
      return;
    }

    console.log(
      "🐍 Updating snake for player:",
      playerData.id,
      "Body length:",
      playerData.body?.length
    );

    this.playerData = playerData;
    this.node.active = true;

    // Update snake position and body
    this.updateSnakeBody(playerData);
  }

  // Create initial snake body
  createSnakeBody(playerData) {
    if (!playerData.body || playerData.body.length === 0) {
      console.warn("🐍 No body data for snake");
      return;
    }

    playerData.body.forEach((segment, index) => {
      this.createSegment(segment, index);
    });
  }

  // Update snake body positions
  updateSnakeBody(playerData) {
    if (!playerData.body || playerData.body.length === 0) {
      console.warn("🐍 No body data to update");
      return;
    }

    // Clear old segments
    this.clearSegments();

    // Create new segments with updated positions
    playerData.body.forEach((segment, index) => {
      this.createSegment(segment, index);
    });
  }

  // Create a single segment
  createSegment(segmentData, index) {
    const segmentNode = new cc.Node(`Segment_${index}`);
    segmentNode.parent = this.node;

    // Add sprite component
    const sprite = segmentNode.addComponent(cc.Sprite);

    // FIXED: Sử dụng ColorSprite thay vì texture để đảm bảo hiển thị
    const spriteFrame = this.getDefaultSpriteFrame();
    if (spriteFrame) {
      sprite.spriteFrame = spriteFrame;
    }

    // ALTERNATIVE: Nếu không có sprite frame, dùng Graphics component
    if (!spriteFrame) {
      segmentNode.removeComponent(cc.Sprite);
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

    // Set color based on head or body
    const isHead = index === 0;
    segmentNode.color = isHead
      ? this.getPlayerHeadColor(this.playerId)
      : this.getPlayerBodyColor(this.playerId);

    // Set size
    segmentNode.width = this.gridSize;
    segmentNode.height = this.gridSize;

    // Set position - Convert from grid coordinates to world coordinates
    const worldPos = this.gridToWorldPosition(segmentData);
    segmentNode.setPosition(worldPos.x, worldPos.y);

    // Store segment reference
    this.segments.push(segmentNode);

    console.log(
      `🐍 Created segment ${index} at grid(${segmentData.x}, ${segmentData.y}) -> world(${worldPos.x}, ${worldPos.y})`
    );
  }

  // Convert grid position to world position
  gridToWorldPosition(gridPos) {
    // FIXED: Cập nhật kích thước canvas mới 960x640
    const canvasWidth = 960;
    const canvasHeight = 640;

    // Convert từ server position sang local position trong canvas
    const worldX = gridPos.x - canvasWidth / 2;
    const worldY = canvasHeight / 2 - gridPos.y; // Flip Y axis

    console.log(
      `🔄 Grid(${gridPos.x}, ${gridPos.y}) -> World(${worldX}, ${worldY})`
    );
    return { x: worldX, y: worldY };
  }

  // Get default white square sprite frame
  getDefaultSpriteFrame() {
    // FIXED: Sử dụng built-in default sprite thay vì tự tạo texture
    try {
      // Cố gắng lấy default sprite frame từ engine
      const defaultSpriteFrame = new cc.SpriteFrame();

      // Tạo texture đơn giản
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 32, 32);

      const img = new Image();
      img.src = canvas.toDataURL();

      const texture = new cc.Texture2D();
      texture.initWithElement(img);
      defaultSpriteFrame.setTexture(texture);

      return defaultSpriteFrame;
    } catch (error) {
      console.warn("🐍 Could not create sprite frame:", error);
      return null;
    }
  }

  // Clear all segments
  clearSegments() {
    if (!this.segments || !this.segments.length) {
      return;
    }

    // Destroy individual segments first
    this.segments.forEach((segment) => {
      if (segment && cc.isValid(segment)) {
        segment.destroy();
      }
    });
    this.segments = [];

    // Only clear children if node is still valid and has children property
    if (this.node && cc.isValid(this.node) && this.node.children) {
      this.node.removeAllChildren();
    }
  }

  // Get player head color
  getPlayerHeadColor(playerId) {
    const colors = [
      cc.Color.GREEN,
      cc.Color.BLUE,
      cc.Color.YELLOW,
      cc.Color.MAGENTA,
      cc.Color.CYAN,
      cc.Color.ORANGE,
    ];
    const hash = this.hashCode(playerId);
    return colors[Math.abs(hash) % colors.length];
  }

  // Get player body color (darker than head)
  getPlayerBodyColor(playerId) {
    const headColor = this.getPlayerHeadColor(playerId);
    return new cc.Color(
      Math.floor(headColor.r * 0.7),
      Math.floor(headColor.g * 0.7),
      Math.floor(headColor.b * 0.7),
      255
    );
  }

  // Hash function for consistent colors
  hashCode(str) {
    let hash = 0;
    if (!str) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Debug: Log current snake state
  logSnakeState() {
    console.log("🐍 Snake State:");
    console.log("  Player ID:", this.playerId);
    console.log("  Segments:", this.segments.length);
    console.log("  Active:", this.node.active);
    console.log("  Position:", this.node.getPosition());
  }

  onDestroy() {
    console.log("🐍 Snake component destroyed for player:", this.playerId);

    // Clear segments safely
    try {
      if (this.segments && this.segments.length > 0) {
        // Only destroy individual segments, don't touch the node
        this.segments.forEach((segment) => {
          if (segment && cc.isValid(segment)) {
            segment.destroy();
          }
        });
      }
    } catch (error) {
      console.warn("🐍 Error clearing segments:", error);
    }

    // Clear references
    this.segments = null;
    this.playerId = null;
    this.playerData = null;
  }
}
