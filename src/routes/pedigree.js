const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pedigreeController = require("../controllers/pedigree");
const { userAuthenticated } = require("../middlewares/auth");

const app = express.Router();

const uploadDir = path.join(__dirname, "../uploads/pedigrees");
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

app.get("/pedigrees", userAuthenticated, pedigreeController.index);

app.get("/pedigrees/:id", pedigreeController.getById);

app.delete("/pedigrees/:id", userAuthenticated, pedigreeController.delete);

app.post(
  "/pedigrees/store",
  userAuthenticated,
  upload.single("img"),
  pedigreeController.store
);

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
  "/pedigrees/updateImg/:id",
  userAuthenticated,
  upload.single("img"),
  pedigreeController.updateImg
);

app.put(
  "/pedigrees/:id",
  userAuthenticated,
  upload.single("img"),
  pedigreeController.update
);

module.exports = app;
