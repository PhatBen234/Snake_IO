export default class SocketManagerController {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.currentRoom = null;
    this.quitConfirmTimer = null;
    this.eventHandlers = {};
  }

  initialize(handlers) {
    this.eventHandlers = handlers;
  }

  async connect() {
    this.socket = window.gameSocket;

    if (!this.socket?.connected) {
      throw new Error("No socket connection");
    }

    this.playerId = this.socket.id;
    this.currentRoom = window.currentRoomId;

    if (!this.playerId || !this.currentRoom) {
      throw new Error("Missing player ID or room ID");
    }

    this.setupSocketEvents();
  }

  setupSocketEvents() {
    const events = [
      "game-started",
      "game-state",
      "game-ended",
      "player-joined",
      "player-left",
      "start-game-failed",
      "quit-room-success",
      "quit-room-failed",
    ];

    // Clear existing listeners
    events.forEach((event) => this.socket.off(event));

    // Setup new listeners
    this.socket.on("game-started", this.eventHandlers.onGameStarted);
    this.socket.on("game-state", this.eventHandlers.onGameState);
    this.socket.on("game-ended", this.eventHandlers.onGameEnded);
    this.socket.on("player-left", this.eventHandlers.onPlayerLeft);
    this.socket.on("start-game-failed", this.eventHandlers.onStartGameFailed);
    this.socket.on("quit-room-success", this.eventHandlers.onQuitRoomSuccess);
    this.socket.on("quit-room-failed", this.eventHandlers.onQuitRoomFailed);
  }

  startGame() {
    if (this.socket && this.currentRoom && this.playerId) {
      this.socket.emit("start-game", {
        roomId: this.currentRoom,
        playerId: this.playerId,
      });
    }
  }

  sendPlayerMove(direction) {
    if (this.socket && this.currentRoom && this.playerId) {
      this.socket.emit("player-move", {
        roomId: this.currentRoom,
        playerId: this.playerId,
        direction: direction,
      });
    }
  }

  quitRoom(isGameActive, updateStatusCallback, clearChatCallback) {
    if (!this.socket || !this.currentRoom || !this.playerId) {
      updateStatusCallback("Cannot leave room - missing information!");
      return;
    }

    if (isGameActive) {
      if (!this.quitConfirmTimer) {
        updateStatusCallback(
          "Press ESC again to confirm quit (you will lose points)"
        );

        this.quitConfirmTimer = setTimeout(() => {
          this.quitConfirmTimer = null;
          updateStatusCallback("Game in progress...");
        }, 3000);
        return;
      } else {
        clearTimeout(this.quitConfirmTimer);
        this.quitConfirmTimer = null;
      }
    }

    updateStatusCallback("Leaving room...");

    this.socket.emit("quit-room", {
      roomId: this.currentRoom,
      playerId: this.playerId,
    });

    clearChatCallback();
  }

  getMyPlayer(players) {
    return players?.find((p) => p.id === this.playerId);
  }

  isConnected() {
    return this.socket?.connected && this.currentRoom && this.playerId;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getPlayerId() {
    return this.playerId;
  }

  reset() {
    if (this.quitConfirmTimer) {
      clearTimeout(this.quitConfirmTimer);
      this.quitConfirmTimer = null;
    }

    window.currentRoomId = null;
    this.currentRoom = null;
  }

  cleanup() {
    if (this.socket) {
      const events = [
        "game-started",
        "game-state",
        "game-ended",
        "player-joined",
        "player-left",
        "start-game-failed",
        "quit-room-success",
        "quit-room-failed",
      ];

      events.forEach((event) => this.socket.off(event));
    }

    this.reset();
  }
}
