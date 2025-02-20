const express = require("express");
const posts = require("../controllers/posts");

const app = express.Router();
app.get("/posts", posts.get);
app.get("/posts/:id", posts.getById);
app.post("/posts/store", posts.store);
app.delete("/posts/:id", posts.delete);
app.patch("/posts/:id", posts.update);
module.exports = app;
