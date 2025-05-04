const express = require("express");
const posts = require("../controllers/posts");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.get("/posts", userAuthenticated, posts.get);
app.get("/postsNextOrPrevious", userAuthenticated, posts.getNextOrPrevious);
app.get("/posts/:id", userAuthenticated, posts.getById);
app.post("/posts/store", userAuthenticated, posts.store);
app.delete("/posts/:id", userAuthenticated, posts.delete);
app.patch("/posts/:id", userAuthenticated, posts.update);
module.exports = app;
