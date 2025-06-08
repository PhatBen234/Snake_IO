const { ccclass, property } = cc._decorator;

@ccclass
export default class LeaderboardController extends cc.Component {
  // UI Elements
  @property(cc.Node)
  leaderboardPanel = null;

  @property(cc.Node)
  playersLayout = null;

  @property(cc.Prefab)
  playerItemPrefab = null;

  @property(cc.Button)
  okButton = null;

  // Data
  playerScores = [];
  isVisible = false;

  onLoad() {
    this.setupButtons();
    this.hideLeaderboard();
  }

  setupButtons() {
    // OK Button
    if (this.okButton) {
      this.okButton.node.on("click", this.onOkClick, this);
    }
  }

  // Main method to show leaderboard
  showLeaderboard(players) {
    if (!players || players.length === 0) {
      console.warn("No players data to show leaderboard");
      return;
    }

    this.playerScores = this.processPlayerData(players);
    this.createLeaderboardItems();
    this.showPanel();
  }

  // Process and sort player data - chỉ lấy top 3
  processPlayerData(players) {
    let playerArray = [];
    
    // Convert to array if it's a Map
    if (players instanceof Map) {
      playerArray = Array.from(players.values());
    } else if (Array.isArray(players)) {
      playerArray = players;
    } else {
      console.error("Invalid players data format");
      return [];
    }

    // Sort by score (descending) and take top 3
    return playerArray
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((player, index) => ({
        rank: index + 1,
        name: player.name || `Player ${player.id}`,
        score: player.score || 0
      }));
  }

  // Create leaderboard items
  createLeaderboardItems() {
    if (!this.playersLayout) {
      console.error("Players layout not found");
      return;
    }

    // Clear existing items
    this.playersLayout.removeAllChildren();

    // Create items for each player
    this.playerScores.forEach((playerData) => {
      const item = this.createPlayerItem(playerData);
      if (item) {
        this.playersLayout.addChild(item);
      }
    });

    // Update layout
    const layout = this.playersLayout.getComponent(cc.Layout);
    if (layout) {
      layout.updateLayout();
    }
  }

  // Create individual player item
  createPlayerItem(playerData) {
    if (!this.playerItemPrefab) {
      console.error("Player item prefab not found");
      return null;
    }

    const itemNode = cc.instantiate(this.playerItemPrefab);
    
    // Setup item data với prefab
    this.setupPlayerItem(itemNode, playerData);

    return itemNode;
  }

  // Setup player item with data
  setupPlayerItem(itemNode, playerData) {
    // Tìm các component trong prefab và update
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

  // Show leaderboard panel
  showPanel() {
    if (this.leaderboardPanel) {
      this.leaderboardPanel.active = true;
      this.isVisible = true;
    }
  }

  // Hide leaderboard panel
  hideLeaderboard() {
    if (this.leaderboardPanel) {
      this.leaderboardPanel.active = false;
    }
    this.isVisible = false;
  }

  // Button handler - quay về JoinRoom scene
  onOkClick() {
    console.log("Returning to JoinRoom...");
    
    // Clear game data
    this.clearGameData();
    
    // Load JoinRoom scene
    cc.director.loadScene("JoinRoom");
  }

  // Clear game-related data
  clearGameData() {
    // Clear global game data
    window.currentRoomId = null;
    window.currentPlayerId = null;
    window.gameSocket = null;
    window.allPlayers = null;

    // Clear local data
    this.playerScores = [];
  }

  // Public methods
  isLeaderboardVisible() {
    return this.isVisible;
  }

  onDestroy() {
    // Clean up nếu cần
    this.playerScores = [];
  }
}

module.exports = LeaderboardController;