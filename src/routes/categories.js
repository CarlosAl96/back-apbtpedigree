const express = require("express");
const categoryController = require("../controllers/categories");

const app = express.Router();
app.get("/categories", categoryController.get);
app.get("/categories/:id", categoryController.getById);
app.post("/categories/store", categoryController.store);
app.delete("/categories/:id", categoryController.delete);
app.patch("/categories/:id", categoryController.update);
module.exports = app;
