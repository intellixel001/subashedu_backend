import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { existsSync, mkdirSync } from "fs";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import path from "path";
import { Server as SocketIOServer } from "socket.io";

// Models
import { Message } from "./models/message.model.js";
import { Student } from "./models/student.model.js";

// Routers
import { CORS_ORIGIN } from "./constants.js";
import adminRouter from "./routes/admin.route.js";
import homeRouter from "./routes/home.route.js";
import staffRouter from "./routes/staff.route.js";
import studentRouter from "./routes/student.route.js";

// App setup
const app = express();
const httpServer = createServer(app);

// CORS setup
const allowedOrigins = CORS_ORIGIN;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Middleware
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));
app.use(cookieParser());
app.use(express.static("public"));

// Ensure /public/temp directory exists
const tempDir = path.join(process.cwd(), "public", "temp");
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.cookie?.match(/accessToken=([^;]+)/)?.[1];

    if (!token) return next(new Error("No token provided"));

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const student = await Student.findById(decoded.id).select(
      "-password -refreshToken"
    );

    if (!student) return next(new Error("Student not found"));

    socket.student = student;
    next();
  } catch (error) {
    console.error("Socket.IO Auth Error:", error.message);
    next(new Error("Invalid or expired token"));
  }
});

// Socket.IO logic
io.on("connection", (socket) => {
  const studentName = socket.student.fullName;

  socket.on("join class", async (classId) => {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return socket.emit("error", "Invalid class ID");
    }

    socket.join(classId);

    try {
      const messages = await Message.find({ classId })
        .populate("createdBy", "fullName")
        .sort({ createdAt: 1 });
      socket.emit("load messages", messages);
    } catch (err) {
      console.error("Failed to load messages:", err);
      socket.emit("error", "Failed to load messages");
    }
  });

  socket.on("send message", async ({ content, classId }) => {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return socket.emit("error", "Invalid class ID");
    }
    if (!content?.trim()) {
      return socket.emit("error", "Message content cannot be empty");
    }

    try {
      const message = new Message({
        content,
        classId,
        createdBy: socket.student._id,
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id).populate(
        "createdBy",
        "fullName"
      );

      io.to(classId).emit("receive message", populatedMessage);
    } catch (err) {
      console.error("Message send error:", err);
      socket.emit("error", "Failed to send message");
    }
  });

  socket.on("disconnect", () => {});
});

// API Routes
app.use("/api", homeRouter);
app.use("/api/student", studentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/staff", staffRouter);

// Export
export { app, httpServer };
