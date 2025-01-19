const express = require("express");
const cors = require("cors");
const path = require("path");
const dbConnect = require("./config/db");

const { API_VERSION, API_NAME } = process.env;

const app = express();

const httpServer = require("http").createServer(app);

const usersRoutes = require("./routes/user");
const pedigreesRoutes = require("./routes/pedigree");
const categoriesRoutes = require("./routes/categories");
const topicsRoutes = require("./routes/topics");
const postsRoutes = require("./routes/posts");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  req.con = dbConnect;
  next();
});

const basePath = `/${API_NAME}/${API_VERSION}`;

app.use(basePath, usersRoutes);
app.use(basePath, pedigreesRoutes);
app.use(basePath, categoriesRoutes);
app.use(basePath, topicsRoutes);
app.use(basePath, postsRoutes);
module.exports = httpServer;
