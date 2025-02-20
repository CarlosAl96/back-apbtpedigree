const express = require("express");
const messageController = require("../controllers/message");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.delete("/message/delete/:id", userAuthenticated, messageController.delete);
app.get("/message/get", userAuthenticated, messageController.get);
app.post("/message/store", userAuthenticated, messageController.store);
module.exports = app;
