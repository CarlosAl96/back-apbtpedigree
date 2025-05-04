const express = require("express");
const categoryController = require("../controllers/categories");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();
app.get("/categories", userAuthenticated, categoryController.get);
app.get("/categoriesInfo", userAuthenticated, categoryController.getInfo);
app.get("/categories/:id", userAuthenticated, categoryController.getById);
app.post("/categories/store", userAuthenticated, categoryController.store);
app.delete("/categories/:id", userAuthenticated, categoryController.delete);
app.patch("/categories/:id", userAuthenticated, categoryController.update);
app.patch(
  "/markAllForums",
  userAuthenticated,
  categoryController.markAllAsViewed
);
app.patch(
  "/categories/:id/order",
  userAuthenticated,
  categoryController.orderChange
);
app.patch(
  "/categories/:id/lock",
  userAuthenticated,
  categoryController.lockOrUnlockCategory
);

module.exports = app;
