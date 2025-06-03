export default class SocketManager {
  socket = null;
  playerId = null;
  callbacks = {};

  constructor() {
    this.callbacks = {};
  }

  connectToServer() {
    this.socket = window.io("http://localhost:3000", {
      transports: ["websocket"],
    });

    this.setupBaseEvents();
  }

  setupBaseEvents() {
    this.socket.on("connect", () => {
      this.playerId = this.socket.id;
      console.log("✅ Connected to server, id:", this.playerId);
      this.triggerCallback("connect", { playerId: this.playerId });
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Disconnected from server");
      this.triggerCallback("disconnect");
    });

    // Room events
    this.socket.on("room-created", (data) => {
      console.log("🏠 Room created:", data);
      this.triggerCallback("room-created", data);
    });

    this.socket.on("joined-room", (data) => {
      console.log("🎉 Joined room:", data);
      this.triggerCallback("joined-room", data);
    });

    this.socket.on("player-joined", (data) => {
      console.log("👥 Player joined:", data);
      this.triggerCallback("player-joined", data);
    });

    this.socket.on("player-left", (data) => {
      console.log("👋 Player left:", data);
      this.triggerCallback("player-left", data);
    });

    this.socket.on("new-host", (data) => {
      console.log("👑 New host assigned:", data);
      this.triggerCallback("new-host", data);
    });

    this.socket.on("game-started", () => {
      console.log("🚀 Game Started!");
      this.triggerCallback("game-started");
    });

    this.socket.on("room-full", () => {
      console.log("🚫 Room is full");
      this.triggerCallback("room-full");
    });

    this.socket.on("join-failed", (data) => {
      console.log("❌ Join failed:", data.reason);
      this.triggerCallback("join-failed", data);
    });

    this.socket.on("create-failed", (data) => {
      console.log("❌ Create failed:", data.reason);
      this.triggerCallback("create-failed", data);
    });
  }

  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  triggerCallback(event, data = null) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => callback(data));
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  getPlayerId() {
    return this.playerId;
  }
}
