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

    this.updatePosition(foodData.position);
    this.setSize(this.gridSize);
    this.setRandomColor();
    this.startEffects();
  }

  updateFood(foodData) {
    if (!foodData) return;

    this.foodData = foodData;
    this.updatePosition(foodData.position);
    this.updateVisibility(foodData.alive);
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

    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    if (this.fruitImage) {
      this.fruitImage.color = randomColor;
    } else {
      this.node.color = randomColor;
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

    const fadeOut = cc.fadeTo(1.0, 150);
    const fadeIn = cc.fadeTo(1.0, 255);
    const sequence = cc.sequence(fadeOut, fadeIn);
    this.glowAction = cc.repeatForever(sequence);

    this.fruitImage.runAction(this.glowAction);
  }

  startEffects() {
    this.startPulseEffect();
    this.scheduleOnce(() => this.startGlowEffect(), Math.random() * 2);
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

    const scaleUp = cc.scaleTo(0.3, 1.5);
    const fadeOut = cc.fadeTo(0.3, 0);
    const parallel = cc.spawn(scaleUp, fadeOut);

    const callback = cc.callFunc(() => {
      this.resetNodeAppearance();
    });

    const sequence = cc.sequence(parallel, callback);
    this.node.runAction(sequence);
  }

  resetNodeAppearance() {
    this.node.scale = 1.0;
    this.node.opacity = 255;
    if (this.fruitImage) {
      this.fruitImage.opacity = 255;
    }
  }

  getFoodInfo() {
    return {
      foodId: this.foodId,
      foodData: this.foodData,
      isAlive: this.node.active,
      position: this.foodData?.position,
    };
  }

  resetFood() {
    this.stopEffects();
    this.resetNodeAppearance();
    this.node.active = true;
    this.setRandomColor();
    this.startEffects();
  }

  onDestroy() {
    this.stopEffects();
  }
}
