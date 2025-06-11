const ChatService = require("../../services/ChatService");

function setupChatHandlers(socket, io) {
  // Handle chat messages
  socket.on("chat-message", (data) => {
    ChatService.handleChatMessage(socket, io, data);
  });

  // Send chat history when player joins room
  socket.on("join-room", (data) => {
    // Send chat history to newly joined player
    ChatService.sendChatHistoryToPlayer(socket, data.roomId);

    // Update player name in chat service
    if (data.playerName && data.playerId) {
      ChatService.updatePlayerName(data.playerId, data.playerName);
    }

    // Removed join message broadcast to prevent spam
  });

  // Handle player leaving room
  socket.on("quit-room", (data) => {
    // Removed leave message broadcast to prevent spam
  });

  // Handle game start - removed system message
  socket.on("start-game", (data) => {
    // Removed game start message to prevent spam
    // Game logic can still continue without chat notification
  });

  // Handle chat history request
  socket.on("request-chat-history", (data) => {
    if (data.roomId) {
      ChatService.sendChatHistoryToPlayer(socket, data.roomId);
    }
  });

  // Handle chat sync request (for scene transitions)
  socket.on("request-chat-sync", (data) => {
    if (data.roomId && data.playerId) {
      ChatService.syncChatDataToPlayer(socket, data.roomId, data.playerId);
    }
  });

  // Handle player name update
  socket.on("update-player-name", (data) => {
    if (data.playerId && data.playerName) {
      ChatService.updatePlayerName(data.playerId, data.playerName);
    }
  });

  // Handle disconnect cleanup
  socket.on("disconnect", () => {
    // Clean up chat service
    ChatService.handlePlayerDisconnect(socket.id);
  });

  // Handle room transition (lobby to game scene)
  socket.on("scene-transition", (data) => {
    if (data.roomId && data.playerId) {
      // Sync chat data for the new scene
      ChatService.syncChatDataToPlayer(socket, data.roomId, data.playerId);

      // Removed scene transition message to prevent spam
    }
  });
}

module.exports = {
  setupChatHandlers,
};
