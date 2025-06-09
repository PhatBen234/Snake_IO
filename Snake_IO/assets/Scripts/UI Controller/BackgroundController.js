cc.Class({
    extends: cc.Component,

    properties: {
        background1: { default: null, type: cc.Node },
        background2: { default: null, type: cc.Node },
        parallaxStrength: { default: 0.1 },
        mouseSmoothness: { default: 0.1 },
        tweenPositions: { default: [], type: [cc.Vec2] },
        tweenScales: { default: [], type: [cc.Float] },
        tweenRotations: { default: [], type: [cc.Float] },
        tweenDurations: { default: [], type: [cc.Float] },
        tweenDelays: { default: [], type: [cc.Float] },
        returnToOriginalDelay: { default: 2 }
    },

    onLoad() {
        if (this.background1) {
            this.bg1OriginalPosition = this.background1.position.clone();
            this.bg1TargetPosition = this.bg1OriginalPosition.clone();
        }

        if (this.background2) {
            this.bg2OriginalPosition = this.background2.position.clone();
            this.bg2OriginalScale = this.background2.scaleX;
            this.bg2OriginalRotation = this.background2.angle || 0;
        }

        this.screenSize = cc.view.getVisibleSize();
        this.screenCenter = cc.v2(this.screenSize.width / 2, this.screenSize.height / 2);

        this.isMouseTracking = false;
        this.bg2CurrentTween = null;
        this.bg2CurrentAction = null;

        this.setupDefaultValues();
    },

    setupDefaultValues() {
        if (this.tweenPositions.length === 0) {
            this.tweenPositions = [
                cc.v2(100, 50),
                cc.v2(-80, 80),
                cc.v2(60, -60),
                cc.v2(-50, -40)
            ];
        }

        if (this.tweenScales.length === 0) {
            this.tweenScales = [1.2, 0.9, 1.1, 1.0];
        }

        if (this.tweenRotations.length === 0) {
            this.tweenRotations = [15, -20, 10, -5];
        }

        if (this.tweenDurations.length === 0) {
            this.tweenDurations = [2, 1.5, 2, 1.8];
        }

        if (this.tweenDelays.length === 0) {
            this.tweenDelays = [1, 1, 1, 1];
        }
    },

    onEnable() {
        this.node.on(cc.Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.node.on(cc.Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.on(cc.Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);

        this.scheduleOnce(() => {
            this.startBackground2Animation();
        }, 0.1);
    },

    onDisable() {
        this.node.off(cc.Node.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.node.off(cc.Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.off(cc.Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);

        this.stopBackground2Animation();
    },

    start() {
        this.node.width = this.screenSize.width;
        this.node.height = this.screenSize.height;
    },

    update(dt) {
        if (this.background1 && this.isMouseTracking) {
            let currentPos = this.background1.position;
            let targetPos = this.bg1TargetPosition;

            let newPos = currentPos.lerp(targetPos, this.mouseSmoothness);
            this.background1.position = newPos;
        }
    },

    onMouseEnter(event) {
        this.isMouseTracking = true;
    },

    onMouseLeave(event) {
        this.isMouseTracking = false;
        if (this.background1) {
            this.bg1TargetPosition = this.bg1OriginalPosition.clone();
        }
    },

    onMouseMove(event) {
        if (!this.background1 || !this.isMouseTracking) return;

        let mousePos = this.node.convertToNodeSpaceAR(event.getLocation());

        let offsetX = mousePos.x * this.parallaxStrength;
        let offsetY = mousePos.y * this.parallaxStrength;

        this.bg1TargetPosition = this.bg1OriginalPosition.add(cc.v2(-offsetX, offsetY));
    },

    startBackground2Animation() {
        if (!this.background2 || !this.background2.active || this.tweenPositions.length === 0) {
            return;
        }

        this.stopBackground2Animation();
        this.createActionSequence();
    },

    createActionSequence() {
        let actions = [];

        for (let i = 0; i < this.tweenPositions.length; i++) {
            let duration = this.tweenDurations[i] || 2;
            let delay = this.tweenDelays[i] || 1;
            let position = this.bg2OriginalPosition.add(this.tweenPositions[i]);
            let scale = this.tweenScales[i] || 1;
            let rotation = this.tweenRotations[i] || 0;

            let moveAction = cc.spawn(
                cc.moveTo(duration, position).easing(cc.easeSineInOut()),
                cc.scaleTo(duration, scale).easing(cc.easeSineInOut()),
                cc.rotateTo(duration, rotation).easing(cc.easeSineInOut())
            );

            actions.push(moveAction);
            if (delay > 0) {
                actions.push(cc.delayTime(delay));
            }
        }

        actions.push(cc.delayTime(this.returnToOriginalDelay));
        actions.push(cc.spawn(
            cc.moveTo(2, this.bg2OriginalPosition).easing(cc.easeSineInOut()),
            cc.scaleTo(2, this.bg2OriginalScale).easing(cc.easeSineInOut()),
            cc.rotateTo(2, this.bg2OriginalRotation).easing(cc.easeSineInOut())
        ));
        actions.push(cc.delayTime(0.5));

        let sequence = cc.sequence(actions);
        this.bg2CurrentAction = cc.repeatForever(sequence);

        this.background2.runAction(this.bg2CurrentAction);
    },

    stopBackground2Animation() {
        if (this.bg2CurrentTween) {
            this.bg2CurrentTween.stop();
            this.bg2CurrentTween = null;
        }

        if (this.bg2CurrentAction && this.background2) {
            this.background2.stopAction(this.bg2CurrentAction);
            this.bg2CurrentAction = null;
        }
    },

    testBackground2Simple() {
        if (!this.background2) {
            return;
        }

        this.stopBackground2Animation();

        let testAction = cc.repeatForever(
            cc.sequence(
                cc.moveTo(1, this.bg2OriginalPosition.add(cc.v2(100, 0))),
                cc.delayTime(0.5),
                cc.moveTo(1, this.bg2OriginalPosition.add(cc.v2(-100, 0))),
                cc.delayTime(0.5),
                cc.moveTo(1, this.bg2OriginalPosition),
                cc.delayTime(0.5)
            )
        );

        this.background2.runAction(testAction);
    },

    restartBackground2Animation() {
        this.startBackground2Animation();
    },

    resetBackground1() {
        if (this.background1) {
            this.background1.position = this.bg1OriginalPosition;
            this.bg1TargetPosition = this.bg1OriginalPosition.clone();
        }
    },

    resetBackground2() {
        this.stopBackground2Animation();
        if (this.background2) {
            this.background2.position = this.bg2OriginalPosition;
            this.background2.scaleX = this.bg2OriginalScale;
            this.background2.scaleY = this.bg2OriginalScale;
            this.background2.rotation = this.bg2OriginalRotation;
        }
    },

    resetAllBackgrounds() {
        this.resetBackground1();
        this.resetBackground2();
    }
});