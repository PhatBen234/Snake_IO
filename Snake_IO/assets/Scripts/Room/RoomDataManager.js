export default class RoomDataManager {
  currentRoom = null;
  roomData = null;
  isHost = false;
  playerId = null;

  constructor(playerId) {
    this.playerId = playerId;
  }

  setRoomData(roomId, roomData, isHost) {
    this.currentRoom = roomId;
    this.roomData = roomData;
    this.isHost = isHost;
  }

  updateRoomData(roomData) {
    this.roomData = roomData;
  }

  setAsHost(isHost) {
    this.isHost = isHost;
  }

  clearRoom() {
    this.currentRoom = null;
    this.roomData = null;
    this.isHost = false;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getRoomData() {
    return this.roomData;
  }

  getIsHost() {
    return this.isHost;
  }

  getPlayerCount() {
    return this.roomData && this.roomData.players
      ? this.roomData.players.length
      : 0;
  }

  getMaxPlayers() {
    return this.roomData ? this.roomData.maxPlayers || 4 : 4;
  }

  getPlayers() {
    return this.roomData && this.roomData.players ? this.roomData.players : [];
  }

  canStartGame(minPlayers = 2) {
    return this.isHost && this.getPlayerCount() >= minPlayers;
  }

  getCurrentPlayer() {
    if (!this.roomData || !this.roomData.players) return null;
    return this.roomData.players.find((player) => player.id === this.playerId);
  }
}
