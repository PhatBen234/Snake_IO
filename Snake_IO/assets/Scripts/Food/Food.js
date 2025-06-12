const { ccclass, property } = cc._decorator;

@ccclass
export default class Food extends cc.Component {
  @property(cc.Node)
  fruitImage = null;

  @property(cc.Animation)
  animation = null;

  foodId = null;
  foodData = null;
  gridSize = 20;
  pulseAction = null;
  glowAction = null;
  // NEW: Track food type
  foodType = "normal";
  // NEW: Action for speed food special effects
  speedFoodAction = null;

  onLoad() {
    if (!this.fruitImage) {
      this.fruitImage = this.node.getChildByName("Fruit Image");
    }

    if (!this.animation && this.fruitImage) {
      this.animation = this.fruitImage.getComponent(cc.Animation);
    }
  }

  start() {
    this.animation?.play();
    this.startPulseEffect();
  }

  initFood(foodId, foodData) {
    this.foodId = foodId;
    this.foodData = foodData;
    // NEW: Set food type from server data
    this.foodType = foodData.type || "normal";

    this.updatePosition(foodData.position);
    this.setSize(this.gridSize);
    // NEW: Update color based on food type
    this.updateFoodColor();
    this.startEffects();
  }

  updateFood(foodData) {
    if (!foodData) return;

    this.foodData = foodData;
    // NEW: Update food type if changed
    if (foodData.type && foodData.type !== this.foodType) {
      this.foodType = foodData.type;
      this.updateFoodColor();
      // Restart effects with new type
      this.stopEffects();
      this.startEffects();
    }

    this.updatePosition(foodData.position);
    this.updateVisibility(foodData.alive);
  }

  // NEW: Update color based on food type
  updateFoodColor() {
    if (!this.fruitImage) return;

    if (this.foodType === "speed") {
      // Màu tím crystal lấp lánh (Purple/Magenta) - nổi bật trên nền đen
      this.fruitImage.color = new cc.Color(186, 85, 211); // Medium Orchid
    } else {
      // Màu bình thường (trắng)
      this.fruitImage.color = cc.Color.WHITE;
    }
  }

  updatePosition(position) {
    if (!position) return;

    const worldPos = this.serverToWorldPosition(position);
    this.node.setPosition(worldPos.x, worldPos.y);
  }

  serverToWorldPosition(serverPos) {
    const canvasWidth = 960;
    const canvasHeight = 640;

    const worldX = serverPos.x - canvasWidth / 2;
    const worldY = canvasHeight / 2 - serverPos.y;

    return { x: worldX, y: worldY };
  }

  setSize(size) {
    this.gridSize = size;
    this.node.width = size;
    this.node.height = size;

    if (this.fruitImage) {
      this.fruitImage.width = size * 0.8;
      this.fruitImage.height = size * 0.8;
    }
  }

  startPulseEffect() {
    if (!this.node?.isValid) return;

    const scaleUp = cc.scaleTo(0.5, 1.2);
    const scaleDown = cc.scaleTo(0.5, 1.0);
    const sequence = cc.sequence(scaleUp, scaleDown);
    this.pulseAction = cc.repeatForever(sequence);

    this.node.runAction(this.pulseAction);
  }

  startGlowEffect() {
    if (!this.fruitImage?.isValid) return;

    if (this.foodType === "speed") {
      // Special shimmer effect for speed food
      this.startShimmerEffect();
    } else {
      // Normal glow effect
      const fadeOut = cc.fadeTo(1.0, 150);
      const fadeIn = cc.fadeTo(1.0, 255);
      const sequence = cc.sequence(fadeOut, fadeIn);
      this.glowAction = cc.repeatForever(sequence);

      this.fruitImage.runAction(this.glowAction);
    }
  }

  // NEW: Shimmer effect for speed food
  startShimmerEffect() {
    if (!this.fruitImage?.isValid) return;

    // Color cycling between purple crystal variations
    const colorCycle = cc.sequence(
      cc.tintTo(0.3, 186, 85, 211), // Medium Orchid
      cc.tintTo(0.3, 255, 105, 180), // Hot Pink
      cc.tintTo(0.3, 147, 0, 211), // Dark Violet
      cc.tintTo(0.3, 186, 85, 211) // Back to Medium Orchid
    );

    this.glowAction = cc.repeatForever(colorCycle);
    this.fruitImage.runAction(this.glowAction);
  }

  // NEW: Gentle rotation effect for speed food
  startSpeedFoodRotation() {
    if (!this.fruitImage?.isValid || this.foodType !== "speed") return;

    const rotateBy = cc.rotateBy(2.0, 360);
    this.speedFoodAction = cc.repeatForever(rotateBy);
    this.fruitImage.runAction(this.speedFoodAction);
  }

  startEffects() {
    this.startPulseEffect();
    this.scheduleOnce(() => this.startGlowEffect(), Math.random() * 2);

    // NEW: Add rotation effect for speed food
    if (this.foodType === "speed") {
      this.scheduleOnce(() => this.startSpeedFoodRotation(), Math.random() * 1);
    }
  }

  stopEffects() {
    if (this.pulseAction) {
      this.node.stopAction(this.pulseAction);
      this.pulseAction = null;
    }

    if (this.glowAction && this.fruitImage) {
      this.fruitImage.stopAction(this.glowAction);
      this.glowAction = null;
    }

    // NEW: Stop speed food rotation
    if (this.speedFoodAction && this.fruitImage) {
      this.fruitImage.stopAction(this.speedFoodAction);
      this.speedFoodAction = null;
    }
  }

  updateVisibility(isAlive) {
    this.node.active = isAlive;
    if (!isAlive) {
      this.stopEffects();
    }
  }

  onEaten() {
    this.createEatEffect();
    this.updateVisibility(false);
  }

  createEatEffect() {
    if (!this.node?.isValid) return;

    let scaleUp, fadeOut;

    if (this.foodType === "speed") {
      // Special eat effect for speed food
      scaleUp = cc.scaleTo(0.3, 2.0); // Bigger scale
      fadeOut = cc.fadeTo(0.3, 0);

      // Add sparkle effect
      const sparkle = cc.sequence(
        cc.tintTo(0.1, 255, 255, 255), // White flash
        cc.tintTo(0.2, 186, 85, 211) // Back to purple
      );

      const parallel = cc.spawn(scaleUp, fadeOut, sparkle);

      const callback = cc.callFunc(() => {
        this.resetNodeAppearance();
      });

      const sequence = cc.sequence(parallel, callback);
      this.node.runAction(sequence);
    } else {
      // Normal eat effect
      scaleUp = cc.scaleTo(0.3, 1.5);
      fadeOut = cc.fadeTo(0.3, 0);
      const parallel = cc.spawn(scaleUp, fadeOut);

      const callback = cc.callFunc(() => {
        this.resetNodeAppearance();
      });

      const sequence = cc.sequence(parallel, callback);
      this.node.runAction(sequence);
    }
  }

  resetNodeAppearance() {
    this.node.scale = 1.0;
    this.node.opacity = 255;
    if (this.fruitImage) {
      this.fruitImage.opacity = 255;
      this.fruitImage.rotation = 0; // Reset rotation
    }
  }

  getFoodInfo() {
    return {
      foodId: this.foodId,
      foodData: this.foodData,
      foodType: this.foodType, // NEW: Include food type
      isAlive: this.node.active,
      position: this.foodData?.position,
    };
  }

  resetFood() {
    this.stopEffects();
    this.resetNodeAppearance();
    this.node.active = true;
    this.updateFoodColor(); // NEW: Reset color when resetting food
    this.startEffects();
  }

  onDestroy() {
    this.stopEffects();
  }
}
