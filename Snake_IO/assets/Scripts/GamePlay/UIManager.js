import { GameConfig } from "./GameConfig";

export default class UIManager {
  constructor() {
    this.scoreLabel = null;
    this.statusLabel = null;
    this.resultLabel = null;
    this.scoreTablePopup = null;
    this.backToLobbyButton = null;
    this.chatControllerNode = null;
    this.onBackToLobbyCallback = null;
  }

  initialize(config) {
    this.scoreLabel = config.scoreLabel;
    this.statusLabel = config.statusLabel;
    this.resultLabel = config.resultLabel;
    this.scoreTablePopup = config.scoreTablePopup;
    this.backToLobbyButton = config.backToLobbyButton;
    this.chatControllerNode = config.chatControllerNode;
    this.onBackToLobbyCallback = config.onBackToLobby;

    this.setupScoreTablePopup();
    this.setupResultPanel();
  }

  setupScoreTablePopup() {
    if (this.scoreTablePopup) {
      this.scoreTablePopup.active = false;
    }

    if (this.backToLobbyButton) {
      this.backToLobbyButton.node.on("click", this.onBackToLobbyCallback, this);
    }
  }

  setupResultPanel() {
    if (this.resultLabel && this.resultLabel.node) {
      this.resultLabel.node.active = false;
    }
  }

  updateScore(score) {
    if (this.scoreLabel) {
      this.scoreLabel.string = `Score: ${score}`;
    }
  }

  updateStatus(status) {
    if (this.statusLabel) {
      this.statusLabel.string = status;
    }
  }

  updateReult(status) {
    if (this.resultLabel) {
      this.resultLabel.string = status;
    }
  }

  showGameEndMessage(data) {
    let statusMessage = "";
    if (data.isDraw) {
      statusMessage = "DRAW";
    } else if (data.winner) {
      statusMessage = `WINNER ${data.winner}`;
    } else {
      statusMessage = "GAME OVER";
    }

    if (this.resultLabel && this.resultLabel.node) {
      this.resultLabel.node.active = true;
    }
    this.updateReult(statusMessage);
    return statusMessage;
  }

  showPlayerLeftMessage(data) {
    if (data.reason === "quit" || data.reason === "disconnect") {
      this.updateStatus(`${data.playerName} has left the room`);
    }
  }

  sendChatMessage(message) {
    if (this.chatControllerNode) {
      const chatController =
        this.chatControllerNode.getComponent("ChatController");
      if (chatController) {
        chatController.displaySystemMessage(message, cc.Color.YELLOW);
      }
    }
  }

  clearChatHistory() {
    if (this.chatControllerNode) {
      const chatController =
        this.chatControllerNode.getComponent("ChatController");
      if (chatController) {
        chatController.clearChatHistory();
      }
    }
  }

  hideScoreTablePopup() {
    if (!this.scoreTablePopup) return;

    const scaleAction = cc.scaleTo(0.2, 0);
    const fadeAction = cc.fadeTo(0.2, 0);
    const hideAction = cc.callFunc(() => {
      this.scoreTablePopup.active = false;
    });

    const sequence = cc.sequence(cc.spawn(scaleAction, fadeAction), hideAction);
    this.scoreTablePopup.runAction(sequence);
  }

  getGameEndMessage(data) {
    return this.showGameEndMessage(data);
  }

  reset() {
    if (this.scoreLabel) {
      this.scoreLabel.string = "Score: 0";
    }

    if (this.scoreTablePopup) {
      this.scoreTablePopup.active = false;
    }

    if (this.resultLabel && this.resultLabel.node) {
      this.resultLabel.node.active = false;
    }
  }
}