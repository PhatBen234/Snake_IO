require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const socketHandler = require("./sockets/socketHandler");
const firebaseService = require("./db/firebaseService");
const leaderboardRoutes = require("./routes/leaderboard");
const screenshotRoutes = require("./routes/screenshot");
const app = express();

const corsOptions = {
  origin: "http://localhost:7456",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

firebaseService.init();

// API Routes
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/screenshot", screenshotRoutes);

// Serve static files from resources folder (for direct image access)
app.use("/resources", express.static(path.join(__dirname, "resources")));

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
