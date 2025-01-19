const express = require("express");
const topics = require('../controllers/topics');

const app = express.Router();
app.get("/topics", topics.get);
app.post("/topics/store", topics.store);
app.delete("/topics/:id", topics.delete);
// app.patch("/categories/:id", categoryController.update);
module.exports = app;