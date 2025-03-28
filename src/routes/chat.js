const express = require("express");
const chatController = require("../controllers/chat");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.delete("/chat/delete/:id", userAuthenticated, chatController.delete);
app.patch("/chat/view/:id", userAuthenticated, chatController.viewChat);
app.get("/chat/get", userAuthenticated, chatController.get);
app.get("/chat/getChatsCount", userAuthenticated, chatController.getChatsCount);
module.exports = app;
