const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const userController = require("../controllers/user");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();

const uploadDir = path.join(__dirname, "../uploads/users");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

app.get("/users", userAuthenticated, userController.index);
app.get("/sessionStatus", userAuthenticated, userController.sessionStatus);
app.get("/usersSearch", userAuthenticated, userController.searchUsers);
app.get("/users/:id", userAuthenticated, userController.readUser);
app.get(
  "/users/:username/getByUsername",
  userAuthenticated,
  userController.getByUsername
);
app.delete("/users/:id", userAuthenticated, userController.delete);
app.patch(
  "/users/:id",
  userAuthenticated,
  upload.single("picture"),
  userController.update
);
app.patch("/users/:id/forumBan", userAuthenticated, userController.forumBan);
app.patch(
  "/users/:id/streamChatBan",
  userAuthenticated,
  userController.streamChatBan
);
app.patch("/users/:id/disable", userAuthenticated, userController.disable);
app.get("/usersInfo", userController.usersLoggedInfo);
app.post("/users/auth", userController.login);
app.post("/users/store", upload.single("picture"), userController.store);
app.post("/users/logout", userAuthenticated, userController.logout);

app.post("/users/passwordReset", userController.forgotPassword);
app.post("/users/passwordReset/:token", userController.changePassword);
app.patch("/users/:id/updatePassword", userController.updatePassword);
app.get("/dashboard", userAuthenticated, userController.dashboardData);
app.get("/checkChatBan/:id", userAuthenticated, userController.checkChatBan);
module.exports = app;
