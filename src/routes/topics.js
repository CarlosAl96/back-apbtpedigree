const express = require("express");
const topics = require("../controllers/topics");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.get("/topics", userAuthenticated, topics.get);
app.get("/topics/:id", userAuthenticated, topics.getById);
app.post("/topics/store", userAuthenticated, topics.store);
app.patch("/topics/:id", userAuthenticated, topics.update);
app.patch("/topics/:id/sticky", userAuthenticated, topics.sticky);
app.patch("/topics/:id/markAll", userAuthenticated, topics.markAllAsViewed);
app.patch("/topics/:id/lock", userAuthenticated, topics.lock);
app.patch("/topics/:id/announcement", userAuthenticated, topics.announcement);
app.delete("/topics/:id", userAuthenticated, topics.delete);

module.exports = app;
