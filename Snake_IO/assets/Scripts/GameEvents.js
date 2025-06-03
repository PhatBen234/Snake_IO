const { ccclass, property } = cc._decorator;

@ccclass
export default class GameEvents extends cc.Component {
  onJoinedRoom = null;
  onGameStarted = null;
  onGameState = null;
  onGameEnded = null;
  onRoomFull = null;
  onPlayerJoined = null;
  onPlayerLeft = null;

  setupEvents(socket) {
    socket.on("joined-room", (data) => {
      console.log("🎉 Joined room:", data);
      if (this.onJoinedRoom) this.onJoinedRoom(data);
    });

    socket.on("game-started", () => {
      console.log("🚀 Game Started!");
      if (this.onGameStarted) this.onGameStarted();
    });

    socket.on("game-state", (state) => {
      if (this.onGameState) this.onGameState(state);
    });

    socket.on("game-ended", (data) => {
      console.log("🏁 Game Ended:", data);
      if (this.onGameEnded) this.onGameEnded(data);
    });

    socket.on("room-full", () => {
      console.log("🚫 Room is full");
      if (this.onRoomFull) this.onRoomFull();
    });

    socket.on("player-joined", (data) => {
      console.log("👥 Player joined:", data);
      if (this.onPlayerJoined) this.onPlayerJoined(data);
    });

    socket.on("player-left", (data) => {
      console.log("👋 Player left:", data);
      if (this.onPlayerLeft) this.onPlayerLeft(data);
    });
  }
}