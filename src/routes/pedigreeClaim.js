const express = require("express");
const pedigreeClaimController = require("../controllers/pedigreeClaim");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();

app.get("/pedigreeClaims", userAuthenticated, pedigreeClaimController.index);
app.get(
  "/pedigreeClaims/admin",
  userAuthenticated,
  pedigreeClaimController.adminIndex
);
app.post("/pedigreeClaims", userAuthenticated, pedigreeClaimController.store);
app.put(
  "/pedigreeClaims/:id/approve",
  userAuthenticated,
  pedigreeClaimController.approve
);
app.put(
  "/pedigreeClaims/:id/deny",
  userAuthenticated,
  pedigreeClaimController.deny
);
app.delete(
  "/pedigreeClaims/:id",
  userAuthenticated,
  pedigreeClaimController.delete
);

module.exports = app;
