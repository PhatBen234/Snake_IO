cc.Class({
  extends: cc.Component,

  properties: {
    leaderboardPanel: cc.Node,
    leaderboardLayout: cc.Layout,
    entryPrefab: cc.Prefab,
    openButton: cc.Button,
    closeButton: cc.Button,
  },

  onLoad() {
    this.setupButtons();
    this.hidePanel();
  },

  setupButtons() {
    if (this.openButton) {
      this.openButton.node.on("click", this.onOpenButtonClicked, this);
    }

    if (this.closeButton) {
      this.closeButton.node.on("click", this.onCloseButtonClicked, this);
    }
  },

  onOpenButtonClicked() {
    console.log("DA OPEN LEADER BOARD");
    this.showPanel();
    this.loadLeaderboard();
  },

  onCloseButtonClicked() {
    this.hidePanel();
  },

  async loadLeaderboard() {
    try {
      const response = await fetch("http://localhost:3000/api/leaderboard");
      if (!response.ok) throw new Error("API lỗi");

      const res = await response.json();
      const list = res.data;

      if (!Array.isArray(list)) {
        throw new Error("res.data không phải là mảng");
      }

      this.displayLeaderboard(list);
    } catch (err) {
      console.error("Lỗi fetch leaderboard:", err);
      this.showError("❌ Không tải được bảng xếp hạng");
    }
  },

  displayLeaderboard(leaderboardData) {
    this.clearLeaderboard();

    leaderboardData.forEach((entry, index) => {
      this.createLeaderboardEntry(entry, index);
    });

    if (this.leaderboardLayout) {
      this.leaderboardLayout.updateLayout();
    }
  },

  createLeaderboardEntry(entryData, index) {
    if (!this.entryPrefab || !this.leaderboardLayout) {
      console.error("Prefab hoặc Layout chưa được thiết lập");
      return;
    }

    const entryNode = cc.instantiate(this.entryPrefab);

    const entryLabel = entryNode.getComponent(cc.Label);
    if (!entryLabel) {
      console.error("Prefab không có Label component");
      return;
    }

    const rankText = `No.${entryData.rank || index + 1}:  ${
      entryData.playerName || "Unknown"
    }`;
    const scoreText = `Score: ${entryData.score || 0}`;
    entryLabel.string = `${rankText}\n${scoreText}`;

    this.applyRankStyling(entryLabel, entryData.rank || index + 1);

    entryNode.parent = this.leaderboardLayout.node;
  },

  applyRankStyling(label, rank) {
    switch (rank) {
      case 1:
        label.node.color = cc.Color(255, 237, 38);
        break;
      case 2:
        label.node.color = cc.Color(25, 206, 218);
        break;
      case 3:
        label.node.color = new cc.Color(205, 127, 50);
        break;
    }
  },

  clearLeaderboard() {
    if (!this.leaderboardLayout) return;

    const children = this.leaderboardLayout.node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].destroy();
    }
  },

  showError(errorMessage) {
    this.clearLeaderboard();

    if (this.entryPrefab && this.leaderboardLayout) {
      const errorNode = cc.instantiate(this.entryPrefab);
      const errorLabel = errorNode.getComponent(cc.Label);
      if (errorLabel) {
        errorLabel.string = errorMessage;
        errorLabel.node.color = cc.Color.RED;
        errorNode.parent = this.leaderboardLayout.node;
      }
    }
  },

  refreshLeaderboard() {
    this.loadLeaderboard();
  },

  showPanel(show = true) {
    if (this.leaderboardPanel) {
      this.leaderboardPanel.active = show;
    }
  },

  hidePanel() {
    this.showPanel(false);
  },

  onDestroy() {
    if (this.openButton) {
      this.openButton.node.off("click", this.onOpenButtonClicked, this);
    }
    if (this.closeButton) {
      this.closeButton.node.off("click", this.onCloseButtonClicked, this);
    }
  },
});
