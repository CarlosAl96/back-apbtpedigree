const express = require("express");
const paymentController = require("../controllers/payment");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.get("/payment", userAuthenticated, paymentController.get);
app.post("/payment", userAuthenticated, paymentController.store);
app.get("/paymentVerify", userAuthenticated, paymentController.paymentVerify);

module.exports = app;
