const fs = require("fs");

function getFilePath(file) {
  const path = file.path.split("\\");
  const pathSlice = path.slice(2, path.length);
  const folder = pathSlice.join("/");
  return folder;
}

function removeFile(path) {
  try {
    if (!path) {
      console.log("Ruta incorrecta");
    }
    fs.unlinkSync(`src/uploads/${path}`);
  } catch (error) {}
}

function renameAndMoveFile(actualPath, newPath) {
  try {
    if (!actualPath || !newPath) {
      console.log("Ruta incorrecta");
    }
    fs.rename(`src/uploads/${actualPath}`, `src/uploads/${newPath}`, (err) => {
      if (err) {
        console.log("No se pudo mover el archivo");
      } else {
        console.log("Archivo movido y renombrado con éxito.");
      }
    });
  } catch (error) {}
}

module.exports = {
  getFilePath,
  removeFile,
  renameAndMoveFile,
};
