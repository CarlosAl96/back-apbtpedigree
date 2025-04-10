const express = require("express");
const streamMessageController = require("../controllers/streamMessage");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.get("/streamMessage", userAuthenticated, streamMessageController.get);
app.delete(
  "/streamMessage/:id",
  userAuthenticated,
  streamMessageController.delete
);
app.post("/streamMessage", userAuthenticated, streamMessageController.store);

module.exports = app;
