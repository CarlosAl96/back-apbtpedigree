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
// Escuchar conexiones
io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
  });
});
module.exports = httpServer;
