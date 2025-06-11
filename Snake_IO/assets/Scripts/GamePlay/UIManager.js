import { GameConfig } from "./GameConfig";

export default class UIManager {
  constructor() {
    this.scoreLabel = null;
    this.statusLabel = null;
    this.scoreTablePopup = null;
    this.backToLobbyButton = null;
    this.chatControllerNode = null;
    this.onBackToLobbyCallback = null;
  }

  initialize(config) {
    this.scoreLabel = config.scoreLabel;
    this.statusLabel = config.statusLabel;
    this.scoreTablePopup = config.scoreTablePopup;
    this.backToLobbyButton = config.backToLobbyButton;
    this.chatControllerNode = config.chatControllerNode;
    this.onBackToLobbyCallback = config.onBackToLobby;

    this.setupScoreTablePopup();
  }

  setupScoreTablePopup() {
    if (this.scoreTablePopup) {
      this.scoreTablePopup.active = false;
    }

    if (this.backToLobbyButton) {
      this.backToLobbyButton.node.on("click", this.onBackToLobbyCallback, this);
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

  showGameEndMessage(data) {
    let statusMessage = "";
    if (data.isDraw) {
      statusMessage = "Game ended in a draw!";
    } else if (data.winner) {
      statusMessage = `Game ended! Winner: ${data.winner}`;
    } else {
      statusMessage = "Game ended!";
    }

    this.updateStatus(statusMessage);
    return statusMessage;
  }

  showPlayerLeftMessage(data) {
    if (data.reason === "quit" || data.reason === "disconnect") {
      this.updateStatus(`${data.playerName} has left the room`);

      setTimeout(() => {
        this.updateStatus("Game in progress...");
      }, GameConfig.PLAYER_LEFT_MESSAGE_DURATION);
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
  }
}
