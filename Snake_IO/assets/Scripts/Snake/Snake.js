const { ccclass, property } = cc._decorator;

@ccclass
export default class Snake extends cc.Component {
  @property(cc.Sprite)
  headSprite = null;

  // Snake data
  playerId = null;
  body = [];
  direction = { x: 1, y: 0 };
  isAlive = true;

  // Visual settings
  gridSize = 20;
  headColor = cc.Color.GREEN;
  bodyColor = cc.Color.WHITE;

  // Body segments (nodes)
  bodySegments = [];

  onLoad() {
    console.log("🐍 Snake component loaded");

    // Tự động tìm head sprite nếu chưa được assign
    if (!this.headSprite) {
      this.headSprite = this.getComponentInChildren(cc.Sprite);
    }

    // Set initial head properties
    if (this.headSprite) {
      this.headSprite.node.width = this.gridSize;
      this.headSprite.node.height = this.gridSize;
      this.headSprite.node.color = this.headColor;
    }
  }

  // Initialize snake với data từ server
  initializeSnake(playerData) {
    this.playerId = playerData.id;
    this.body = [...playerData.body];
    this.isAlive = playerData.alive;

    // Set màu sắc riêng cho từng player
    this.setPlayerColors(this.playerId);

    // Update visual
    this.updateSnakeVisual();

    console.log(`🐍 Snake initialized for player: ${this.playerId}`);
  }

  // Update snake position và body
  updateSnake(playerData) {
    if (!this.isAlive) return;

    this.body = [...playerData.body];
    this.isAlive = playerData.alive;

    if (!this.isAlive) {
      this.handleDeath();
      return;
    }

    this.updateSnakeVisual();
  }

  // Update visual representation của snake
  updateSnakeVisual() {
    if (!this.body || this.body.length === 0) return;

    // Update head position (segment đầu tiên)
    const headPos = this.body[0];
    this.node.setPosition(headPos.x, headPos.y);

    // Update body segments
    this.updateBodySegments();
  }

  // Tạo và update các body segments
  updateBodySegments() {
    // Remove excess segments
    while (this.bodySegments.length >= this.body.length) {
      const segment = this.bodySegments.pop();
      if (segment && cc.isValid(segment)) {
        segment.destroy();
      }
    }

    // Create new segments if needed
    while (this.bodySegments.length < this.body.length - 1) {
      this.createBodySegment();
    }

    // Update positions (bỏ qua segment đầu tiên vì đó là head)
    for (let i = 1; i < this.body.length; i++) {
      const segment = this.bodySegments[i - 1];
      const pos = this.body[i];

      if (segment && cc.isValid(segment)) {
        segment.setPosition(pos.x, pos.y);
      }
    }
  }

  // Tạo một body segment mới
  createBodySegment() {
    const segmentNode = new cc.Node("BodySegment");
    segmentNode.parent = this.node.parent; // Cùng parent với snake head

    // Add sprite component
    const sprite = segmentNode.addComponent(cc.Sprite);

    // Set properties
    segmentNode.width = this.gridSize;
    segmentNode.height = this.gridSize;
    segmentNode.color = this.bodyColor;

    // Add to segments array
    this.bodySegments.push(segmentNode);

    return segmentNode;
  }

  // Set màu sắc cho player
  setPlayerColors(playerId) {
    const colors = [
      { head: cc.Color.GREEN, body: new cc.Color(0, 200, 0) },
      { head: cc.Color.BLUE, body: new cc.Color(0, 0, 200) },
      { head: cc.Color.YELLOW, body: new cc.Color(200, 200, 0) },
      { head: cc.Color.MAGENTA, body: new cc.Color(200, 0, 200) },
      { head: cc.Color.CYAN, body: new cc.Color(0, 200, 200) },
      { head: cc.Color.RED, body: new cc.Color(200, 0, 0) },
    ];

    const hash = this.hashCode(playerId);
    const colorSet = colors[Math.abs(hash) % colors.length];

    this.headColor = colorSet.head;
    this.bodyColor = colorSet.body;

    // Apply to head sprite
    if (this.headSprite) {
      this.headSprite.node.color = this.headColor;
    }
  }

  // Handle khi snake chết
  handleDeath() {
    this.isAlive = false;
    console.log(`💀 Snake ${this.playerId} died`);

    // Có thể add effect chết ở đây
    this.node.opacity = 128; // Làm mờ snake

    // Schedule destroy after delay
    this.scheduleOnce(() => {
      this.destroySnake();
    }, 1.0);
  }

  // Destroy snake và cleanup
  destroySnake() {
    console.log(`🧹 Destroying snake ${this.playerId}`);

    // Destroy all body segments
    this.bodySegments.forEach((segment) => {
      if (segment && cc.isValid(segment)) {
        segment.destroy();
      }
    });
    this.bodySegments = [];

    // Destroy main node
    if (cc.isValid(this.node)) {
      this.node.destroy();
    }
  }

  // Get snake length
  getLength() {
    return this.body ? this.body.length : 0;
  }

  // Check if position is part of snake body
  isPositionInBody(x, y) {
    return this.body.some((segment) => segment.x === x && segment.y === y);
  }

  // Hash function để tạo màu consistent
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  // Cleanup khi component bị destroy
  onDestroy() {
    console.log(`🧹 Snake component destroyed for player: ${this.playerId}`);

    // Clean up body segments
    this.bodySegments.forEach((segment) => {
      if (segment && cc.isValid(segment)) {
        segment.destroy();
      }
    });
    this.bodySegments = [];
  }
}
