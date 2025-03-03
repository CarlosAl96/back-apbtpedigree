const express = require("express");
const streamMessageController = require("../controllers/streamMessage");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.get("/streamMessage/:id", userAuthenticated, streamMessageController.get);
app.post("/streamMessage", userAuthenticated, streamMessageController.store);

module.exports = app;
