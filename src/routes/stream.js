const express = require("express");
const streamController = require("../controllers/stream");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.get("/stream", userAuthenticated, streamController.get);
app.get("/stream/getActive", userAuthenticated, streamController.getActive);
app.post("/stream", userAuthenticated, streamController.store);
app.patch("/stream/:id", userAuthenticated, streamController.update);
app.patch("/stream/:id/live", userAuthenticated, streamController.setLive);
app.patch(
  "/stream/:id/reAnnounce",
  userAuthenticated,
  streamController.reAnnounce
);
app.get("/stream/proxy/:token", streamController.proxy);

module.exports = app;
