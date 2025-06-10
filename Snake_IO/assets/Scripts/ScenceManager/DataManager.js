export default class DataManager {
  saveGameData(socketManager, roomDataManager) {
    window.gameSocket = socketManager.socket;
    window.currentRoomId = roomDataManager.getCurrentRoom();
    window.currentPlayerId = socketManager.getPlayerId();
    window.roomData = roomDataManager.getRoomData();
  }

  cleanupGameData() {
    // Keep socket connection active
    window.currentRoomId = null;
    window.roomData = null;
  }

  fullCleanup() {
    if (window.gameSocket && window.gameSocket.connected) {
      window.gameSocket.disconnect();
    }

    window.gameSocket = null;
    window.currentRoomId = null;
    window.currentPlayerId = null;
    window.roomData = null;
  }

  hasRequiredGameData() {
    return window.gameSocket && window.currentRoomId;
  }

  // Getter methods for accessing game data
  getSocket() {
    return window.gameSocket;
  }

  getCurrentRoomId() {
    return window.currentRoomId;
  }

  getCurrentPlayerId() {
    return window.currentPlayerId;
  }

  getRoomData() {
    return window.roomData;
  }

  isSocketConnected() {
    return window.gameSocket && window.gameSocket.connected;
  }
}
