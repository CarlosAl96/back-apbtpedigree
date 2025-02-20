const express = require("express");
const topics = require("../controllers/topics");

const app = express.Router();
app.get("/topics", topics.get);
app.get("/topics/:id", topics.getById);
app.post("/topics/store", topics.store);
app.patch("/topics/:id", topics.update);
app.patch("/topics/:id/sticky", topics.sticky);
app.patch("/topics/:id/lock", topics.lock);
app.patch("/topics/:id/announcement", topics.announcement);
app.delete("/topics/:id", topics.delete);

module.exports = app;
