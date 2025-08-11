const express = require("express");
const cors = require("cors");
const path = require("path");
const dbConnect = require("./config/db");
const { Server } = require("socket.io");
const { API_VERSION, API_NAME } = process.env;

const app = express();

const httpServer = require("http").createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});
const usersRoutes = require("./routes/user");
const pedigreesRoutes = require("./routes/pedigree");
const categoriesRoutes = require("./routes/categories");
const topicsRoutes = require("./routes/topics");
const postsRoutes = require("./routes/posts");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");
const streamRoutes = require("./routes/stream");
const paymentRoutes = require("./routes/payment");
const streamMessageRoutes = require("./routes/streamMessage");
const { log } = require("console");

app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  req.con = dbConnect;
  req.io = io;
  next();
});

const basePath = `/${API_NAME}/${API_VERSION}`;

app.use(basePath, usersRoutes);
app.use(basePath, pedigreesRoutes);
app.use(basePath, categoriesRoutes);
app.use(basePath, topicsRoutes);
app.use(basePath, postsRoutes);
app.use(basePath, chatRoutes);
app.use(basePath, messageRoutes);
app.use(basePath, streamRoutes);
app.use(basePath, paymentRoutes);
app.use(basePath, streamMessageRoutes);

const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("register-user", ({ userId, username }) => {
    console.log("Usuario registrado:", userId, username);
    connectedUsers.set(userId, {
      socketId: socket.id,
      lastActive: new Date(),
      username: username || null,
    });

    io.emit("online-users-count", {
      count: connectedUsers.size,
      users: Array.from(connectedUsers.entries()).map(([id, data]) => ({
        id,
        username: data.username,
      })),
    });
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
  });

  socket.on("heartbeat", ({ userId, username }) => {
    if (!userId) {
      return;
    }

    if (connectedUsers.has(userId)) {
      connectedUsers.set(userId, {
        ...connectedUsers.get(userId),
        socketId: socket.id,
        lastActive: new Date(),
        username: username || connectedUsers.get(userId).username || null,
      });
    } else {
      connectedUsers.set(userId, {
        socketId: socket.id,
        lastActive: new Date(),
        username: username || null,
      });
    }
    io.emit("online-users-count", {
      count: connectedUsers.size,
      users: Array.from(connectedUsers.entries()).map(([id, data]) => ({
        id,
        username: data.username,
      })),
    });
  });
});

setInterval(() => {
  const now = new Date();
  for (const [userId, data] of connectedUsers.entries()) {
    if (now - data.lastActive > 300000) {
      connectedUsers.delete(userId);
    }
  }
  io.emit("online-users-count", {
    count: connectedUsers.size,
    users: Array.from(connectedUsers.entries()).map(([id, data]) => ({
      id,
      username: data.username,
    })),
  });
}, 60000);

module.exports = httpServer;
