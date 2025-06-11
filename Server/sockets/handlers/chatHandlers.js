const ChatService = require("../../services/ChatService");

// Track game start messages per room to prevent spam
const gameStartTracker = new Map();

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

  // Handle game start chat message with protection against spam
  socket.on('start-game', (data) => {
    if (!data.roomId) return;
    
    const now = Date.now();
    const lastGameStart = gameStartTracker.get(data.roomId);
    
    // Prevent spam: only allow one game start message per room within 5 seconds
    if (lastGameStart && (now - lastGameStart) < 5000) {
      return;
    }
    
    // Update tracker
    gameStartTracker.set(data.roomId, now);
    
    // Send game start message to chat
    ChatService.broadcastSystemMessage(
      io,
      data.roomId,
      'Game started! Good luck everyone!',
      'cyan'
    );
    
    // Clean up old entries (older than 1 minute)
    cleanupGameStartTracker();
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

// Clean up old game start tracker entries
function cleanupGameStartTracker() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  for (const [roomId, timestamp] of gameStartTracker.entries()) {
    if (timestamp < oneMinuteAgo) {
      gameStartTracker.delete(roomId);
    }
  }
}

// Optional: Clean up tracker periodically
setInterval(cleanupGameStartTracker, 300000); // Clean every 5 minutes

module.exports = {
  setupChatHandlers,
};