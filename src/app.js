const express = require("express");
const cors = require("cors");
const dbConnect = require("./config/db");

const { API_VERSION, API_NAME } = process.env;

const app = express();

const httpServer = require("http").createServer(app);

const usersRoutes = require("./routes/user");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(express.static("src/uploads"));

app.use((req, res, next) => {
  req.con = dbConnect;
  next();
});

const basePath = `/${API_NAME}/${API_VERSION}`;

app.use(basePath, usersRoutes);

module.exports = httpServer;
