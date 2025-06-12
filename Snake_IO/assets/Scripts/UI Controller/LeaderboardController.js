const { ccclass, property } = cc._decorator;

@ccclass
export default class LeaderboardController extends cc.Component {
  @property(cc.Node)
  leaderboardPanel = null;

  @property(cc.Node)
  playersLayout = null;

  @property(cc.Prefab)
  playerItemPrefab = null;

  @property(cc.Button)
  okButton = null;

  playerScores = [];
  isVisible = false;

  onLoad() {
    this.setupButtons();
    this.hideLeaderboard();
  }

  setupButtons() {
    if (this.okButton) {
      this.okButton.node.on("click", this.onOkClick, this);
    }
  }

  showLeaderboard(players) {
    if (!players || players.length === 0) {
      console.warn("No players data to show leaderboard");
      return;
    }

    this.playerScores = this.processPlayerData(players);
    this.createLeaderboardItems();
    this.showPanel();
  }

  processPlayerData(players) {
    let playerArray = [];
    
    if (players instanceof Map) {
      playerArray = Array.from(players.values());
    } else if (Array.isArray(players)) {
      playerArray = players;
    } else {
      console.error("Invalid players data format");
      return [];
    }

    return playerArray
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name || `Player ${player.id}`,
        score: player.score || 0
      }));
  }

  createLeaderboardItems() {
    if (!this.playersLayout) {
      console.error("Players layout not found");
      return;
    }

    this.playersLayout.removeAllChildren();

    this.playerScores.forEach((playerData) => {
      const item = this.createPlayerItem(playerData);
      if (item) {
        this.playersLayout.addChild(item);
      }
    });

    const layout = this.playersLayout.getComponent(cc.Layout);
    if (layout) {
      layout.updateLayout();
    }
  }

  createPlayerItem(playerData) {
    if (!this.playerItemPrefab) {
      console.error("Player item prefab not found");
      return null;
    }

    const itemNode = cc.instantiate(this.playerItemPrefab);
    
    this.setupPlayerItem(itemNode, playerData);

    return itemNode;
  }

  setupPlayerItem(itemNode, playerData) {
    const rankLabel = itemNode.getChildByName("RankLabel")?.getComponent(cc.Label);
    const nameLabel = itemNode.getChildByName("NameLabel")?.getComponent(cc.Label);
    const scoreLabel = itemNode.getChildByName("ScoreLabel")?.getComponent(cc.Label);

    if (rankLabel) {
      rankLabel.string = `#${playerData.rank}`;
    }

    if (nameLabel) {
      nameLabel.string = playerData.name;
    }

    if (scoreLabel) {
      scoreLabel.string = `${playerData.score}`;
    }
  }

  showPanel() {
    if (this.leaderboardPanel) {
      this.leaderboardPanel.active = true;
      this.isVisible = true;
    }
  }

  hideLeaderboard() {
    if (this.leaderboardPanel) {
      this.leaderboardPanel.active = false;
    }
    this.isVisible = false;
  }

  onOkClick() {
    console.log("Returning to JoinRoom...");
    
    this.clearGameData();
    
    cc.director.loadScene("JoinRoom");
  }

  clearGameData() {
    window.currentRoomId = null;
    window.currentPlayerId = null;
    window.gameSocket = null;
    window.allPlayers = null;

    this.playerScores = [];
  }

  isLeaderboardVisible() {
    return this.isVisible;
  }

  onDestroy() {
    this.playerScores = [];
  }
}

module.exports = LeaderboardController;