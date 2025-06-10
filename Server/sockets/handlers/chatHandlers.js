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

  // Handle disconnect cleanup
  socket.on('disconnect', () => {
    // Clean up chat service
    ChatService.handlePlayerDisconnect(socket.id);
  });
}

module.exports = {
  setupChatHandlers,
};