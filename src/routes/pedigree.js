const express = require("express");
const multiparty = require("connect-multiparty");
const pedigreeController = require("../controllers/pedigree");
const { userAuthenticated } = require("../middlewares/auth");

const mdUserImg = multiparty({ uploadDir: "src/uploads/users" });
const app = express.Router();

app.get("/pedigrees", userAuthenticated, pedigreeController.index);
app.get("/pedigrees/:id", pedigreeController.getById);
app.delete("/pedigrees/:id", userAuthenticated, pedigreeController.delete);
app.post("/pedigrees/store", userAuthenticated, pedigreeController.store);
app.put(
  "/pedigrees/changeOwner/:id",
  userAuthenticated,
  pedigreeController.changeOwner
);
app.put(
  "/pedigrees/changePermissions/:id",
  userAuthenticated,
  pedigreeController.changePermissions
);

app.put(
  "/pedigrees/:id",
  userAuthenticated,
  pedigreeController.changePermissions
);

module.exports = app;
