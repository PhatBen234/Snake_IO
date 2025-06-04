const { ccclass, property } = cc._decorator;

@ccclass
export default class Food extends cc.Component {
  @property(cc.Node)
  fruitImage = null;

  @property(cc.Animation)
  animation = null;

  // Food properties
  foodId = null;
  foodData = null;
  gridSize = 20;

  // Animation properties
  pulseAction = null;
  glowAction = null;

  onLoad() {
    // Tự động tìm các component nếu chưa được assign
    if (!this.fruitImage) {
      this.fruitImage = this.node.getChildByName("Fruit Image");
    }

    if (!this.animation && this.fruitImage) {
      this.animation = this.fruitImage.getComponent(cc.Animation);
    }
  }

  start() {
    // Bắt đầu animation nếu có
    if (this.animation) {
      this.animation.play();
    }

    // Start pulse effect
    this.startPulseEffect();
  }

  // Khởi tạo food với dữ liệu từ server
  initFood(foodId, foodData) {
    this.foodId = foodId;
    this.foodData = foodData;

    console.log(`🍎 Initializing food: ${foodId}`, foodData);

    // Set vị trí food
    this.updatePosition(foodData.position);

    // Set kích thước
    this.setSize(this.gridSize);

    // Set màu sắc ngẫu nhiên cho food
    this.setRandomColor();

    // Bắt đầu các effect
    this.startEffects();
  }

  // Cập nhật food với dữ liệu mới
  updateFood(foodData) {
    if (!foodData) {
      console.warn("❌ Invalid food data for update");
      return;
    }

    this.foodData = foodData;

    // Cập nhật vị trí
    this.updatePosition(foodData.position);

    // Cập nhật trạng thái hiển thị
    this.updateVisibility(foodData.alive);
  }

  // Cập nhật vị trí food
  updatePosition(position) {
    if (!position) return;

    const screenPos = this.gameToScreenPosition(position);
    this.node.setPosition(screenPos.x, screenPos.y);
  }

  // Set kích thước food
  setSize(size) {
    this.gridSize = size;
    this.node.width = size;
    this.node.height = size;

    if (this.fruitImage) {
      this.fruitImage.width = size * 0.8; // Nhỏ hơn một chút
      this.fruitImage.height = size * 0.8;
    }
  }

  // Set màu sắc ngẫu nhiên cho food
  setRandomColor() {
    const colors = [
      cc.Color.RED,
      cc.Color.GREEN,
      cc.Color.BLUE,
      cc.Color.YELLOW,
      cc.Color.MAGENTA,
      cc.Color.CYAN,
      cc.Color.ORANGE,
      new cc.Color(255, 192, 203), // Pink
      new cc.Color(128, 0, 128), // Purple
      new cc.Color(255, 165, 0), // Orange
    ];

    const randomIndex = Math.floor(Math.random() * colors.length);
    const selectedColor = colors[randomIndex];

    if (this.fruitImage) {
      this.fruitImage.color = selectedColor;
    } else {
      this.node.color = selectedColor;
    }
  }

  // Bắt đầu pulse effect
  startPulseEffect() {
    if (!this.node || !this.node.isValid) return;

    // Tạo pulse animation
    const scaleUp = cc.scaleTo(0.5, 1.2);
    const scaleDown = cc.scaleTo(0.5, 1.0);
    const sequence = cc.sequence(scaleUp, scaleDown);
    this.pulseAction = cc.repeatForever(sequence);

    this.node.runAction(this.pulseAction);
  }

  // Bắt đầu glow effect
  startGlowEffect() {
    if (!this.fruitImage || !this.fruitImage.isValid) return;

    // Tạo glow animation bằng opacity
    const fadeOut = cc.fadeTo(1.0, 150);
    const fadeIn = cc.fadeTo(1.0, 255);
    const sequence = cc.sequence(fadeOut, fadeIn);
    this.glowAction = cc.repeatForever(sequence);

    this.fruitImage.runAction(this.glowAction);
  }

  // Bắt đầu tất cả effects
  startEffects() {
    this.startPulseEffect();

    // Delay một chút rồi bắt đầu glow effect
    this.scheduleOnce(() => {
      this.startGlowEffect();
    }, Math.random() * 2);
  }

  // Dừng tất cả effects
  stopEffects() {
    if (this.pulseAction) {
      this.node.stopAction(this.pulseAction);
      this.pulseAction = null;
    }

    if (this.glowAction && this.fruitImage) {
      this.fruitImage.stopAction(this.glowAction);
      this.glowAction = null;
    }
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
      console.log(`🍎 Food ${this.foodId} was eaten`);
      this.stopEffects();
    }
  }

  // Được ăn - tạo effect và ẩn food
  onEaten() {
    console.log(`🍎 Food ${this.foodId} eaten!`);

    // Tạo eat effect
    this.createEatEffect();

    // Ẩn food
    this.updateVisibility(false);
  }

  // Tạo effect khi food được ăn
  createEatEffect() {
    if (!this.node || !this.node.isValid) return;

    // Scale up và fade out effect
    const scaleUp = cc.scaleTo(0.3, 1.5);
    const fadeOut = cc.fadeTo(0.3, 0);
    const parallel = cc.spawn(scaleUp, fadeOut);

    const callback = cc.callFunc(() => {
      // Reset lại scale và opacity cho lần sử dụng tiếp theo
      this.node.scale = 1.0;
      this.node.opacity = 255;
      if (this.fruitImage) {
        this.fruitImage.opacity = 255;
      }
    });

    const sequence = cc.sequence(parallel, callback);
    this.node.runAction(sequence);
  }

  // Lấy thông tin food hiện tại
  getFoodInfo() {
    return {
      foodId: this.foodId,
      foodData: this.foodData,
      isAlive: this.node.active,
      position: this.foodData ? this.foodData.position : null,
    };
  }

  // Reset food về trạng thái ban đầu
  resetFood() {
    this.stopEffects();

    this.node.scale = 1.0;
    this.node.opacity = 255;
    this.node.active = true;

    if (this.fruitImage) {
      this.fruitImage.opacity = 255;
    }

    // Set màu mới
    this.setRandomColor();

    // Bắt đầu lại effects
    this.startEffects();
  }

  // Cleanup khi destroy
  onDestroy() {
    console.log(`🧹 Destroying food: ${this.foodId}`);
    this.stopEffects();
  }
}
