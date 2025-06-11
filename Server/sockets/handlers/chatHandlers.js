const ChatService = require("../../services/ChatService");

function setupChatHandlers(socket, io) {
  socket.on("chat-message", (data) => {
    ChatService.handleChatMessage(socket, io, data);
  });

  socket.on("join-room", (data) => {
    ChatService.sendChatHistoryToPlayer(socket, data.roomId);

    if (data.playerName && data.playerId) {
      ChatService.updatePlayerName(data.playerId, data.playerName);
    }

  });


  socket.on("quit-room", (data) => {
  });

  socket.on("start-game", (data) => {
    
  });

  socket.on("request-chat-history", (data) => {
    if (data.roomId) {
      ChatService.sendChatHistoryToPlayer(socket, data.roomId);
    }
  });

  socket.on("request-chat-sync", (data) => {
    if (data.roomId && data.playerId) {
      ChatService.syncChatDataToPlayer(socket, data.roomId, data.playerId);
    }
  });

  socket.on("update-player-name", (data) => {
    if (data.playerId && data.playerName) {
      ChatService.updatePlayerName(data.playerId, data.playerName);
    }
  });

  socket.on("disconnect", () => {
    ChatService.handlePlayerDisconnect(socket.id);
  });

  socket.on("scene-transition", (data) => {
    if (data.roomId && data.playerId) {
      ChatService.syncChatDataToPlayer(socket, data.roomId, data.playerId);
    }
  });
}

module.exports = {
  setupChatHandlers,
};
