const RoomController = require("../../controllers/RoomController");

function setupRoomHandlers(socket, controllers, dependencies) {
  const roomController = new RoomController({
    ...dependencies,
    controllers,
  });

  socket.on("create-room", (data) => {
    roomController.createRoom(socket, data);
  });

  socket.on("join-room", (data) => {
    roomController.joinRoom(socket, data);
  });

  socket.on("leave-room", (data) => {
    roomController.leaveRoom(socket, data);
  });
}

module.exports = {
  setupRoomHandlers,
};
