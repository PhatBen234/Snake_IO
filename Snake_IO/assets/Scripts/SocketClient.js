const { ccclass, property } = cc._decorator;

@ccclass
export default class SocketClient extends cc.Component {
  socket = null;

  start() {
    // Kết nối tới server backend (địa chỉ localhost:3000 nếu chạy local)
    this.socket = window.io("http://localhost:3000", {
      transports: ["websocket"], // dùng websocket để tránh fallback polling
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected to server, id:", this.socket.id);

      // Gửi yêu cầu join room (ví dụ room1)
      this.socket.emit("join-room", {
        roomId: "room1",
        playerId: this.socket.id,
        playerName: "Player1",
      });

      // Khi đã join room thành công
      this.socket.on("joined-room", (roomId) => {
        console.log("🎉 Joined room:", roomId);

        // Yêu cầu server start game
        this.socket.emit("start-game", roomId);
      });
    });

    // Lắng nghe trạng thái game cập nhật từ server
    this.socket.on("game-state", (state) => {
      console.log("📊 Game state update:", state);

      // Ở đây bạn có thể xử lý cập nhật UI, vị trí player, food...
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
    });
  }
}
