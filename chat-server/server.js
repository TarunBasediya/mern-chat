import express from "express";
import http from "http";
import { Server as socketIO } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // Handle room joining
  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`${socket.id} joined room: ${room}`);
  });

  // Listen for messages in a specific room
  socket.on("sendMessage", (messageData) => {
    console.log("Message received in room:", messageData.room);
    console.log(`User: ${messageData.user}, Message: ${messageData.text}`);

    // Emit message to the room
    io.to(messageData.room).emit("receiveMessage", messageData);

    // Notify other rooms of new messages
    socket.broadcast.emit("newMessageNotification", messageData);
  });

  // Handle typing events
  socket.on("typing", (room, user) => {
    console.log(`${user} is typing in room: ${room}`);
    socket.to(room).emit("displayTyping", user);
  });

  socket.on("stopTyping", (room) => {
    console.log(`Stop typing event received for room: ${room}`);
    socket.to(room).emit("removeTyping");
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
