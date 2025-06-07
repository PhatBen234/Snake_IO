export default class RoomDataManager {
  constructor(playerId) {
    this.playerId = playerId;
    this.currentRoom = null;
    this.roomData = null;
    this.isHost = false;
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
    return this.roomData?.players?.length || 0;
  }

  getMaxPlayers() {
    return this.roomData?.maxPlayers || 4;
  }

  getPlayers() {
    return this.roomData?.players || [];
  }

  canStartGame(minPlayers = 2) {
    return this.isHost && this.getPlayerCount() >= minPlayers;
  }

  getCurrentPlayer() {
    return (
      this.getPlayers().find((player) => player.id === this.playerId) || null
    );
  }
}
