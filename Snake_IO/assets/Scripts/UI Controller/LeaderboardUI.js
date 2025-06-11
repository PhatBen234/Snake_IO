cc.Class({
  extends: cc.Component,

  properties: {
    leaderboardPanel: cc.Node, // Panel chứa toàn bộ leaderboard
    leaderboardLayout: cc.Layout, // Layout node để sắp xếp các entry
    entryPrefab: cc.Prefab, // Prefab cho mỗi entry trong leaderboard
    loadingLabel: cc.Label, // Label hiển thị khi đang loading
  },

  onLoad() {
    this.showLoading(true);
    this.loadLeaderboard();
  },

  showLoading(isLoading) {
    if (this.loadingLabel) {
      this.loadingLabel.node.active = isLoading;
      this.loadingLabel.string = isLoading ? "🔄 Đang tải bảng xếp hạng..." : "";
    }
    
    if (this.leaderboardLayout) {
      this.leaderboardLayout.node.active = !isLoading;
    }
  },

  async loadLeaderboard() {
    try {
      const response = await fetch("http://localhost:3000/api/leaderboard");
      if (!response.ok) throw new Error("API lỗi");

      const res = await response.json(); // chứa { data: [...], total, message }
      const list = res.data;

      if (!Array.isArray(list)) {
        throw new Error("res.data không phải là mảng");
      }

      this.showLoading(false);
      this.displayLeaderboard(list);

    } catch (err) {
      console.error("Lỗi fetch leaderboard:", err);
      this.showLoading(false);
      this.showError("❌ Không tải được bảng xếp hạng");
    }
  },

  displayLeaderboard(leaderboardData) {
    // Xóa tất cả các entry cũ
    this.clearLeaderboard();

    // Tạo entry cho mỗi người chơi
    leaderboardData.forEach((entry, index) => {
      this.createLeaderboardEntry(entry, index);
    });

    // Cập nhật layout
    if (this.leaderboardLayout) {
      this.leaderboardLayout.updateLayout();
    }
  },

  createLeaderboardEntry(entryData, index) {
    if (!this.entryPrefab || !this.leaderboardLayout) {
      console.error("Prefab hoặc Layout chưa được thiết lập");
      return;
    }

    // Tạo node từ prefab
    const entryNode = cc.instantiate(this.entryPrefab);
    
    // Tìm label component trong prefab
    const entryLabel = entryNode.getComponent(cc.Label);
    if (!entryLabel) {
      console.error("Prefab không có Label component");
      return;
    }

    // Tạo text cho entry
    const rankText = `No.${entryData.rank || (index + 1)}:  ${entryData.playerName || 'Unknown'}`;
    const scoreText = `Score: ${entryData.score || 0}`;
    entryLabel.string = `${rankText}\n${scoreText}`;

    // Thêm màu sắc đặc biệt cho top 3
    this.applyRankStyling(entryLabel, entryData.rank || (index + 1));

    // Thêm vào layout
    entryNode.parent = this.leaderboardLayout.node;
  },

  applyRankStyling(label, rank) {
    // Thay đổi màu sắc dựa trên thứ hạng
    switch (rank) {
      case 1:
        label.node.color = cc.Color.YELLOW; // Vàng cho hạng 1
        break;
      case 2:
        label.node.color = cc.Color.WHITE; // Trắng bạc cho hạng 2
        break;
      case 3:
        label.node.color = new cc.Color(205, 127, 50); // Đồng cho hạng 3
        break;
      default:
        label.node.color = cc.Color.WHITE; // Trắng cho các hạng khác
        break;
    }
  },

  clearLeaderboard() {
    if (!this.leaderboardLayout) return;

    // Xóa tất cả children của layout
    const children = this.leaderboardLayout.node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      children[i].destroy();
    }
  },

  showError(errorMessage) {
    this.clearLeaderboard();
    
    // Tạo một entry hiển thị lỗi
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

  // Phương thức để refresh leaderboard từ bên ngoài
  refreshLeaderboard() {
    this.showLoading(true);
    this.loadLeaderboard();
  },

  // Phương thức để show/hide panel
  showPanel(show = true) {
    if (this.leaderboardPanel) {
      this.leaderboardPanel.active = show;
    }
  },

  hidePanel() {
    this.showPanel(false);
  }
});