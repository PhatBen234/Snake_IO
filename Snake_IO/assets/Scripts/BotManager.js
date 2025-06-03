// const { ccclass, property } = cc._decorator;

// @ccclass
// export default class BotManager extends cc.Component {
//   currentRoom = null;

//   setCurrentRoom(roomId) {
//     this.currentRoom = roomId;
//   }

//   createMultipleTestPlayers(count = 2) {
//     if (!this.currentRoom) {
//       console.log("❌ No room available for bots");
//       return;
//     }

//     console.log(`👥 Creating ${count} additional test players...`);

//     for (let i = 1; i <= count; i++) {
//       setTimeout(() => {
//         this.createTestBot(i);
//       }, i * 500);
//     }
//   }

//   createTestBot(botNumber) {
//     const testSocket = window.io("http://localhost:3000", {
//       transports: ["websocket"],
//     });

//     testSocket.on("connect", () => {
//       console.log(`🤖 Test bot ${botNumber} connected:`, testSocket.id);

//       testSocket.emit("join-room", {
//         roomId: this.currentRoom,
//         playerId: testSocket.id,
//         playerName: `TestBot_${botNumber}`,
//       });
//     });

//     testSocket.on("game-started", () => {
//       this.startBotAI(testSocket);
//     });
//   }

//   startBotAI(socket) {
//     const directions = [
//       { x: 1, y: 0 },
//       { x: 0, y: 1 },
//       { x: -1, y: 0 },
//       { x: 0, y: -1 },
//     ];

//     setInterval(() => {
//       const randomDir = directions[Math.floor(Math.random() * directions.length)];
//       socket.emit("player-move", {
//         roomId: this.currentRoom,
//         playerId: socket.id,
//         direction: randomDir,
//       });
//     }, 1000 + Math.random() * 2000);
//   }
// }