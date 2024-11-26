const express = require("express");
const multiparty = require("connect-multiparty");
const userController = require("../controllers/user");
const { userAuthenticated } = require("../middlewares/auth");

const mdUserImg = multiparty({ uploadDir: "src/uploads/users" });
const app = express.Router();

app.get("/users", userAuthenticated, userController.index);
app.get("/users/:id", userAuthenticated, userController.readUser);
app.post("/users/auth", userController.login);
app.post("/users/store", userController.store);
app.post("/users/logout", userAuthenticated, userController.logout);
module.exports = app;
