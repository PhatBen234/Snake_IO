const { ccclass, property } = cc._decorator;

@ccclass
export default class SocketManager extends cc.Component {
  socket = null;
  playerId = null;
  currentRoom = null;

  connect(serverUrl = "http://localhost:3000") {
    this.socket = window.io(serverUrl, {
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      this.playerId = this.socket.id;
      console.log("✅ Connected to server, id:", this.playerId);
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
    });

    return this.socket;
  }

  joinRoom(roomId = "test-room", playerName = null) {
    if (!this.socket) return;

    const name = playerName || `TestPlayer_${this.playerId.substring(0, 4)}`;
    
    console.log("📥 Attempting to join room:", roomId);

    this.socket.emit("join-room", {
      roomId: roomId,
      playerId: this.playerId,
      playerName: name,
    });
  }

  sendMove(direction) {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit("player-move", {
      roomId: this.currentRoom,
      playerId: this.playerId,
      direction: direction,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  onDestroy() {
    this.disconnect();
  }
}