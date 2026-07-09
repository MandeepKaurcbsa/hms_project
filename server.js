//starts server with Socket.IO for WebRTC signaling

const http = require("http");
const app = require("./app");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ── WebRTC Signaling ──
io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Join a video call room
  socket.on("join-room", (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    if (numClients >= 2) {
      socket.emit("room-full");
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`[Socket] ${socket.id} joined room ${roomId} (${numClients + 1}/2)`);

    // Tell the new joiner how many people are already in the room
    if (numClients === 1) {
      // Second person joined — tell them to create an offer
      socket.emit("other-user", Array.from(room).find((id) => id !== socket.id));
      // Tell the first person someone joined
      socket.to(roomId).emit("user-joined", socket.id);
    }
  });

  // Relay WebRTC offer
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  // Relay WebRTC answer
  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  // Relay ICE candidates
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    if (socket.roomId) {
      socket.to(socket.roomId).emit("user-left", socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO signaling server ready`);
});