require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const socketHandler = require("./sockets/socketHandler");
const firebaseService = require("./db/firebaseService");
const leaderboardRoutes = require("./routes/leaderboard"); // ADD THIS LINE

const app = express();

// CORS: chỉ cho phép từ Cocos Creator (localhost:7456)
const corsOptions = {
  origin: "http://localhost:7456",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

firebaseService.init();

// API Routes
app.use("/api/leaderboard", leaderboardRoutes); // ADD THIS LINE

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:7456",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

socketHandler(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
