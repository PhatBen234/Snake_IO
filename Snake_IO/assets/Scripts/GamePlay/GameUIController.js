const { ccclass, property } = cc._decorator;

@ccclass
export default class GameUIController extends cc.Component {
  // UI Elements
  @property(cc.Label)
  scoreLabel = null;

  @property(cc.Label)
  statusLabel = null;

  @property(cc.Label)
  playerCountLabel = null;

  @property(cc.Label)
  timerLabel = null;

  @property(cc.Node)
  pausePanel = null;

  @property(cc.Node)
  gameOverPanel = null;

  @property(cc.Label)
  gameOverText = null;

  @property(cc.Button)
  pauseButton = null;

  @property(cc.Button)
  resumeButton = null;

  @property(cc.Button)
  quitButton = null;

  @property(cc.Button)
  restartButton = null;

  // Game state
  isPaused = false;
  currentScore = 0;
  gameTime = 0;
  playerCount = 0;

  onLoad() {
    this.setupButtons();
    this.initializeUI();
  }

  setupButtons() {
    // Pause button
    if (this.pauseButton) {
      this.pauseButton.node.on("click", this.onPauseClick, this);
    }

    // Resume button
    if (this.resumeButton) {
      this.resumeButton.node.on("click", this.onResumeClick, this);
    }

    // Quit button
    if (this.quitButton) {
      this.quitButton.node.on("click", this.onQuitClick, this);
    }

    // Restart button
    if (this.restartButton) {
      this.restartButton.node.on("click", this.onRestartClick, this);
    }

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    cc.systemEvent.on(
      cc.SystemEvent.EventType.KEY_DOWN,
      (event) => {
        switch (event.keyCode) {
          case cc.macro.KEY.escape:
            this.togglePause();
            break;
          case cc.macro.KEY.r:
            if (event.ctrlKey || event.metaKey) {
              this.onRestartClick();
            }
            break;
          case cc.macro.KEY.q:
            if (event.ctrlKey || event.metaKey) {
              this.onQuitClick();
            }
            break;
        }
      },
      this
    );
  }

  initializeUI() {
    // Hide panels initially
    if (this.pausePanel) {
      this.pausePanel.active = false;
    }

    if (this.gameOverPanel) {
      this.gameOverPanel.active = false;
    }

    // Initialize labels
    this.updateScore(0);
    this.updateStatus("Chuẩn bị game...");
    this.updatePlayerCount(0);
    this.updateTimer(0);
  }

  // Score management
  updateScore(score) {
    this.currentScore = score;
    if (this.scoreLabel) {
      this.scoreLabel.string = `Score: ${score}`;
    }
  }

  addScore(points) {
    this.updateScore(this.currentScore + points);
  }

  // Status updates
  updateStatus(status) {
    if (this.statusLabel) {
      this.statusLabel.string = status;
    }
    console.log("📢 Game Status:", status);
  }

  updatePlayerCount(count) {
    this.playerCount = count;
    if (this.playerCountLabel) {
      this.playerCountLabel.string = `Players: ${count}`;
    }
  }

  updateTimer(seconds) {
    this.gameTime = seconds;
    if (this.timerLabel) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.timerLabel.string = `Time: ${minutes}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  }

  // Game state management
  onGameStart() {
    this.updateStatus("Game đã bắt đầu!");
    this.hideAllPanels();
  }

  onGamePause() {
    this.isPaused = true;
    this.showPausePanel();
    this.updateStatus("Game tạm dừng");
  }

  onGameResume() {
    this.isPaused = false;
    this.hidePausePanel();
    this.updateStatus("Game tiếp tục!");
  }

  onGameEnd(result) {
    this.showGameOverPanel(result);

    if (result.winner) {
      if (result.winner === window.currentPlayerId) {
        this.updateStatus("Bạn thắng!");
      } else {
        this.updateStatus(`${result.winnerName} thắng!`);
      }
    } else {
      this.updateStatus("Game kết thúc!");
    }
  }

  onPlayerDeath() {
    this.updateStatus("Bạn đã chết! Quan sát các player khác...");
  }

  // Panel management
  showPausePanel() {
    if (this.pausePanel) {
      this.pausePanel.active = true;
    }
  }

  hidePausePanel() {
    if (this.pausePanel) {
      this.pausePanel.active = false;
    }
  }

  showGameOverPanel(result) {
    if (this.gameOverPanel) {
      this.gameOverPanel.active = true;

      if (this.gameOverText && result) {
        let gameOverMessage = "Game Kết Thúc!\n\n";

        if (result.winner) {
          if (result.winner === window.currentPlayerId) {
            gameOverMessage += "🎉 Bạn đã thắng!";
          } else {
            gameOverMessage += `👑 ${
              result.winnerName || result.winner
            } thắng!`;
          }
        } else {
          gameOverMessage += "🤝 Hòa!";
        }

        gameOverMessage += `\n\nScore cuối: ${this.currentScore}`;
        gameOverMessage += `\nThời gian: ${Math.floor(this.gameTime / 60)}:${(
          this.gameTime % 60
        )
          .toString()
          .padStart(2, "0")}`;

        this.gameOverText.string = gameOverMessage;
      }
    }
  }

  hideGameOverPanel() {
    if (this.gameOverPanel) {
      this.gameOverPanel.active = false;
    }
  }

  hideAllPanels() {
    this.hidePausePanel();
    this.hideGameOverPanel();
  }

  // Button handlers
  onPauseClick() {
    if (!this.isPaused) {
      this.togglePause();
    }
  }

  onResumeClick() {
    if (this.isPaused) {
      this.togglePause();
    }
  }

  onQuitClick() {
    // Show confirmation first
    this.showQuitConfirmation();
  }

  onRestartClick() {
    // Show confirmation first
    this.showRestartConfirmation();
  }

  togglePause() {
    if (this.isPaused) {
      this.onGameResume();
      // Emit resume event to server if needed
      this.emitGameEvent("resume-game");
    } else {
      this.onGamePause();
      // Emit pause event to server if needed
      this.emitGameEvent("pause-game");
    }
  }

  // Confirmation dialogs
  showQuitConfirmation() {
    const confirmDialog = this.createConfirmDialog(
      "Thoát Game",
      "Bạn có chắc muốn thoát về lobby?",
      () => this.confirmQuit(),
      () => this.cancelAction()
    );
  }

  showRestartConfirmation() {
    const confirmDialog = this.createConfirmDialog(
      "Khởi động lại",
      "Bạn có chắc muốn bắt đầu game mới?",
      () => this.confirmRestart(),
      () => this.cancelAction()
    );
  }

  createConfirmDialog(title, message, onConfirm, onCancel) {
    // Create simple confirmation dialog
    const dialogNode = new cc.Node("ConfirmDialog");
    dialogNode.parent = this.node;

    // Background overlay
    const bg = dialogNode.addComponent(cc.Sprite);
    dialogNode.color = new cc.Color(0, 0, 0, 180);
    dialogNode.width = cc.winSize.width;
    dialogNode.height = cc.winSize.height;

    // Dialog panel
    const panel = new cc.Node("Panel");
    panel.parent = dialogNode;
    const panelBg = panel.addComponent(cc.Sprite);
    panel.color = cc.Color.WHITE;
    panel.width = 300;
    panel.height = 200;

    // Title
    const titleNode = new cc.Node("Title");
    titleNode.parent = panel;
    titleNode.y = 50;
    const titleLabel = titleNode.addComponent(cc.Label);
    titleLabel.string = title;
    titleLabel.fontSize = 20;
    titleLabel.node.color = cc.Color.BLACK;

    // Message
    const messageNode = new cc.Node("Message");
    messageNode.parent = panel;
    messageNode.y = 0;
    const messageLabel = messageNode.addComponent(cc.Label);
    messageLabel.string = message;
    messageLabel.fontSize = 16;
    messageLabel.node.color = cc.Color.BLACK;

    // Buttons
    const confirmBtn = this.createDialogButton("Đồng ý", -60, -50, () => {
      dialogNode.destroy();
      onConfirm();
    });
    confirmBtn.parent = panel;

    const cancelBtn = this.createDialogButton("Hủy", 60, -50, () => {
      dialogNode.destroy();
      onCancel();
    });
    cancelBtn.parent = panel;

    return dialogNode;
  }

  createDialogButton(text, x, y, callback) {
    const btnNode = new cc.Node("Button");
    btnNode.x = x;
    btnNode.y = y;

    const button = btnNode.addComponent(cc.Button);
    const sprite = btnNode.addComponent(cc.Sprite);
    btnNode.color = cc.Color.GRAY;
    btnNode.width = 80;
    btnNode.height = 30;

    const label = new cc.Node("Label");
    label.parent = btnNode;
    const labelComp = label.addComponent(cc.Label);
    labelComp.string = text;
    labelComp.fontSize = 14;
    label.color = cc.Color.WHITE;

    btnNode.on("click", callback);

    return btnNode;
  }

  confirmQuit() {
    console.log("🚪 Quitting game...");
    this.emitGameEvent("leave-game");

    // Use SceneManager to return to lobby
    const SceneManager = require("./SceneManager").default;
    if (SceneManager.getInstance()) {
      SceneManager.returnToLobby();
    } else {
      cc.director.loadScene("LobbyScene");
    }
  }

  confirmRestart() {
    console.log("🔄 Restarting game...");
    this.emitGameEvent("restart-game");

    // Reset UI state
    this.initializeUI();
  }

  cancelAction() {
    console.log("❌ Action cancelled");
  }

  // Helper methods
  emitGameEvent(eventName, data = {}) {
    if (window.gameSocket && window.gameSocket.connected) {
      const eventData = {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
        ...data,
      };

      window.gameSocket.emit(eventName, eventData);
      console.log(`📡 Emitted ${eventName}:`, eventData);
    }
  }

  // Animation helpers
  showScoreAnimation(points) {
    if (!this.scoreLabel) return;

    // Create floating score text
    const floatingScore = new cc.Node("FloatingScore");
    floatingScore.parent = this.node;
    floatingScore.setPosition(this.scoreLabel.node.getPosition());

    const label = floatingScore.addComponent(cc.Label);
    label.string = `+${points}`;
    label.fontSize = 24;
    label.node.color = cc.Color.GREEN;

    // Animate floating up and fade out
    const moveAction = cc.moveBy(1.0, 0, 50);
    const fadeAction = cc.fadeOut(1.0);
    const removeAction = cc.callFunc(() => floatingScore.destroy());

    const sequence = cc.sequence(
      cc.spawn(moveAction, fadeAction),
      removeAction
    );

    floatingScore.runAction(sequence);
  }

  flashStatus(message, color = cc.Color.WHITE) {
    if (!this.statusLabel) return;

    const originalColor = this.statusLabel.node.color;
    const originalText = this.statusLabel.string;

    // Flash effect
    this.statusLabel.string = message;
    this.statusLabel.node.color = color;

    const flashAction = cc.sequence(
      cc.scaleTo(0.1, 1.2),
      cc.scaleTo(0.1, 1.0),
      cc.delayTime(1.0),
      cc.callFunc(() => {
        this.statusLabel.node.color = originalColor;
        if (this.statusLabel.string === message) {
          this.statusLabel.string = originalText;
        }
      })
    );

    this.statusLabel.node.runAction(flashAction);
  }

  onDestroy() {
    // Clean up event listeners
    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this);
  }
}
