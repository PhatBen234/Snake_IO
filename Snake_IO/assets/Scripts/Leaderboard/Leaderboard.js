cc.Class({
  extends: cc.Component,

  properties: {
    leaderboardLabel: cc.Label, // Kéo Label node vào đây
  },

  onLoad() {
    this.loadLeaderboard();
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

      let text = "🏆 Leaderboard:\n";
      list.forEach((entry) => {
        text += `${entry.rank}. ${entry.playerName}: ${entry.score}\n`;
      });

      this.leaderboardLabel.string = text;
    } catch (err) {
      console.error("Lỗi fetch leaderboard:", err);
      this.leaderboardLabel.string = "❌ Không tải được bảng xếp hạng";
    }
  },
});
