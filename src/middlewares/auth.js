const { decodeToken } = require("../utils/jwt");
const User = require("../models/user");

async function userAuthenticated(req, res, next) {
  const { authorization } = req.headers;
  if (typeof authorization === "undefined" || authorization === "") {
    return res.status(401).send({ response: "El token es requerido" });
  }
  const token = authorization.replace("Bearer ", "");

  try {
    const dataToken = decodeToken(token);

    const session = await User.getSession(req.con, token);

    if (session.length === 0) {
      return res.status(401).send({ response: "El token es inválido" });
    }
    if (dataToken.exp < new Date().getTime()) {
      return res.status(401).send({ response: "El token ha expirado" });
    }
    next();
  } catch (error) {
    return res.status(401).send({ response: "El token es inválido" });
  }
}

module.exports = {
  userAuthenticated,
};
