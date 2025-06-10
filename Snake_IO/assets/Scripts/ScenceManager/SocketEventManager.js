export default class SocketEventManager {
  emitLeaveGameEvent() {
    if (this.canEmitSocketEvent()) {
      window.gameSocket.emit("leave-game", {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
      });
    }
  }

  emitLeaveRoomEvent() {
    if (this.canEmitSocketEvent()) {
      window.gameSocket.emit("leave-room", {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
      });
    }
  }

  canEmitSocketEvent() {
    return (
      window.gameSocket &&
      window.gameSocket.connected &&
      window.currentRoomId &&
      window.currentPlayerId
    );
  }

  // Additional socket event methods can be added here
  emitJoinRoomEvent(roomId, playerId) {
    if (window.gameSocket && window.gameSocket.connected) {
      window.gameSocket.emit("join-room", {
        roomId: roomId,
        playerId: playerId,
      });
    }
  }

  emitStartGameEvent() {
    if (this.canEmitSocketEvent()) {
      window.gameSocket.emit("start-game", {
        roomId: window.currentRoomId,
        playerId: window.currentPlayerId,
      });
    }
  }

  // Socket event listeners can be managed here
  setupSocketListeners() {
    if (!window.gameSocket) return;

    window.gameSocket.on("room-joined", this.onRoomJoined.bind(this));
    window.gameSocket.on("game-started", this.onGameStarted.bind(this));
    window.gameSocket.on("player-left", this.onPlayerLeft.bind(this));
  }

  onRoomJoined(data) {
    console.log("Room joined:", data);
  }

  onGameStarted(data) {
    console.log("Game started:", data);
  }

  onPlayerLeft(data) {
    console.log("Player left:", data);
  }

  removeSocketListeners() {
    if (!window.gameSocket) return;

    window.gameSocket.off("room-joined", this.onRoomJoined);
    window.gameSocket.off("game-started", this.onGameStarted);
    window.gameSocket.off("player-left", this.onPlayerLeft);
  }
}
