import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import videoDownloadRoutes from "./routes/videoDownload.js";
import apiPaymentRoutes from "./routes/apiPayment.js";
import path from "path";
import fs from "fs";
import checkUserRegion from "./middleware/checkUserRegion.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.set("trust proxy", true);
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", (req, res, next) => {
  const localPath = path.join("uploads", req.path);
  fs.access(localPath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.redirect(`https://you-tube2-0-six-backend.onrender.com/uploads${req.path}`);
    }
    next();
  });
});
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use(checkUserRegion);
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/api/videos", videoDownloadRoutes);
app.use("/api/payments", apiPaymentRoutes);

// ─── Room Creation API ────────────────────────────────────────────────────────
import crypto from "crypto";

// In-memory room metadata store: roomId → { roomName, createdBy, createdAt }
const roomMetadata = new Map();

// POST /room/create — generate a unique room ID server-side
app.post("/room/create", (req, res) => {
  const { roomName, userId } = req.body;

  // Generate a cryptographically random 8-character alphanumeric ID
  // Using crypto.randomBytes ensures no collisions and IDs can't be guessed
  const roomId = crypto.randomBytes(4).toString("hex"); // 8 hex chars = 4 billion+ combinations

  // Store the display name as metadata (not used as the URL identifier)
  roomMetadata.set(roomId, {
    roomName: roomName || "Untitled Room",
    createdBy: userId || "anonymous",
    createdAt: new Date().toISOString(),
  });

  console.log(`[Room] Created room "${roomName || "Untitled"}" → ID: ${roomId}`);

  res.json({
    roomId,
    roomName: roomName || "Untitled Room",
  });
});

// GET /room/:id — retrieve room metadata (optional, for display purposes)
app.get("/room/:id", (req, res) => {
  const meta = roomMetadata.get(req.params.id);
  if (meta) {
    return res.json({ roomId: req.params.id, ...meta });
  }
  // Room exists implicitly via Socket.io even if not in metadata
  res.json({ roomId: req.params.id, roomName: req.params.id });
});

const PORT = process.env.PORT || 5000;

// ─── WebRTC Signaling via Socket.io ───────────────────────────────────────────
// Track mappings: userId → socket.id
const userSocketMap = new Map();

// Track users inside each room: roomId → [{ userId, userName, socketId }]
const roomMembers = new Map();

io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  let currentRoomId = null;
  let currentUserId = null;

  // join-room: Associates a userId with this socket, joins a room, and updates the list
  socket.on("join-room", ({ roomId, userId, userName }) => {
    socket.join(roomId);
    currentRoomId = roomId;
    currentUserId = userId;
    userSocketMap.set(userId, socket.id);

    console.log(`[Socket.io] User ${userId} (${userName}) joined room ${roomId}`);

    // Update room members
    if (!roomMembers.has(roomId)) {
      roomMembers.set(roomId, []);
    }
    const members = roomMembers.get(roomId);
    // Avoid duplicates
    if (!members.find(m => m.userId === userId)) {
      members.push({ userId, userName: userName || "Guest", socketId: socket.id });
    }
    roomMembers.set(roomId, members);

    // Broadcast updated room user list to everyone in the room
    io.to(roomId).emit("room-users", members);
  });

  // call-user: Relay a WebRTC offer from the caller to the target user
  socket.on("call-user", ({ offer, to }) => {
    const targetSocketId = userSocketMap.get(to) || to;
    if (targetSocketId) {
      io.to(targetSocketId).emit("incoming-call", {
        offer,
        from: currentUserId || socket.id, // Send caller's userId or socketId
        fromSocket: socket.id
      });
    }
  });

  // answer-call: Relay a WebRTC answer back to the original caller
  socket.on("answer-call", ({ answer, to }) => {
    const targetSocketId = userSocketMap.get(to) || to;
    if (targetSocketId) {
      io.to(targetSocketId).emit("call-answered", {
        answer,
        from: currentUserId || socket.id,
      });
    }
  });

  // ice-candidate: Relay ICE candidates between peers for NAT traversal
  socket.on("ice-candidate", ({ candidate, to }) => {
    const targetSocketId = userSocketMap.get(to) || to;
    if (targetSocketId) {
      io.to(targetSocketId).emit("ice-candidate", {
        candidate,
        from: currentUserId || socket.id,
      });
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", () => {
    // Remove this socket from the userId→socketId map
    if (currentUserId) {
      userSocketMap.delete(currentUserId);
    }

    // Remove from room members
    if (currentRoomId) {
      const members = roomMembers.get(currentRoomId) || [];
      const updatedMembers = members.filter(m => m.socketId !== socket.id);
      if (updatedMembers.length > 0) {
        roomMembers.set(currentRoomId, updatedMembers);
        io.to(currentRoomId).emit("room-users", updatedMembers);
      } else {
        roomMembers.delete(currentRoomId);
      }
    }
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});
// ──────────────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const dbURI = process.env.MONGODB_URI || process.env.DB_URL || 'mongodb://127.0.0.1:27017/youtube_clone';
mongoose
  .connect(dbURI)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
