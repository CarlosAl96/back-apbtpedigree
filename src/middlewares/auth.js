const { decodeToken } = require("../utils/jwt");

function userAuthenticated(req, res, next) {
  const { authorization } = req.headers;
  if (typeof authorization === "undefined" || authorization === "") {
    return res.status(401).send({ response: "El token es requerido" });
  }
  const token = authorization.replace("Bearer ", "");

  try {
    const dataToken = decodeToken(token);
    next();
  } catch (error) {
    return res.status(401).send({ response: "El token es inválido" });
  }
}

module.exports = {
  userAuthenticated,
};
