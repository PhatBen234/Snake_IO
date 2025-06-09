export default class SocketManager {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.callbacks = {};
  }

  connectToServer() {
    this.socket = window.io("http://localhost:3000", {
      transports: ["websocket"],
    });

    this.setupEvents();
  }

  setupEvents() {
    const events = [
      "connect",
      "disconnect",
      "room-created",
      "joined-room",
      "player-joined",
      "player-left",
      "new-host",
      "game-started",
      "room-full",
      "join-failed",
      "create-failed",
    ];

    this.socket.on("connect", () => {
      this.playerId = this.socket.id;
      this.triggerCallback("connect", { playerId: this.playerId });
    });

    events.slice(1).forEach((event) => {
      this.socket.on(event, (data) => {
        this.triggerCallback(event, data);
      });
    });
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  triggerCallback(event, data = null) {
    this.callbacks[event]?.forEach((callback) => callback(data));
  }

  emit(event, data) {
    return this.socket?.connected
      ? (this.socket.emit(event, data), true)
      : false;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  disconnect() {
    this.socket?.disconnect();
  }

  getPlayerId() {
    return this.playerId;
  }
}
