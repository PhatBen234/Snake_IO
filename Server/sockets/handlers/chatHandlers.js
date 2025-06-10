const ChatService = require("../../services/ChatService");

function setupChatHandlers(socket, io) {
  // Handle chat messages
  socket.on('chat-message', (data) => {
    ChatService.handleChatMessage(socket, io, data);
  });

  // Send chat history when player joins room
  socket.on('join-room', (data) => {
    // Send chat history to newly joined player
    ChatService.sendChatHistoryToPlayer(socket, data.roomId);

    // Update player name in chat service
    if (data.playerName && data.playerId) {
      ChatService.updatePlayerName(data.playerId, data.playerName);
    }

    // Broadcast join message to room
    if (data.playerName) {
      ChatService.broadcastSystemMessage(
        io,
        data.roomId,
        `${data.playerName} joined the room`,
        'green'
      );
    }
  });

  // Handle player leaving room
  socket.on('quit-room', (data) => {
    // Broadcast leave message to room
    if (data.playerName) {
      ChatService.broadcastSystemMessage(
        io,
        data.roomId,
        `${data.playerName} left the room`,
        'orange'
      );
    }
  });

  // Handle game start chat message
  socket.on('start-game', (data) => {
    // Send game start message to chat
    ChatService.broadcastSystemMessage(
      io,
      data.roomId,
      'Game started! Good luck everyone!',
      'cyan'
    );
  });

  // Handle chat history request
  socket.on('request-chat-history', (data) => {
    if (data.roomId) {
      ChatService.sendChatHistoryToPlayer(socket, data.roomId);
    }
  });

  // Handle chat sync request (for scene transitions)
  socket.on('request-chat-sync', (data) => {
    if (data.roomId && data.playerId) {
      ChatService.syncChatDataToPlayer(socket, data.roomId, data.playerId);
    }
  });

  // Handle player name update
  socket.on('update-player-name', (data) => {
    if (data.playerId && data.playerName) {
      ChatService.updatePlayerName(data.playerId, data.playerName);
    }
  });

  // Handle disconnect cleanup
  socket.on('disconnect', () => {
    // Clean up chat service
    ChatService.handlePlayerDisconnect(socket.id);
  });

  // Handle room transition (lobby to game scene)
  socket.on('scene-transition', (data) => {
    if (data.roomId && data.playerId) {
      // Sync chat data for the new scene
      ChatService.syncChatDataToPlayer(socket, data.roomId, data.playerId);
      
      // Optionally broadcast a system message about scene transition
      if (data.sceneName) {
        ChatService.broadcastSystemMessage(
          io,
          data.roomId,
          `Players are transitioning to ${data.sceneName}`,
          'blue'
        );
      }
    }
  });
}

module.exports = {
  setupChatHandlers,
};