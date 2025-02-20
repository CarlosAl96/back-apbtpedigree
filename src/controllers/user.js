const User = require("../models/user");
const { createAccessToken, createRefreshToken } = require("../utils/jwt");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { decodeToken } = require("../utils/jwt");

module.exports = {
  index: async (req, res) => {
    const { page, size, orderBy, search, active } = req.query;

    let condition = "WHERE 1=1 ";

    if (search) {
      condition += `AND (username LIKE '%${search}%' OR email LIKE '%${search}%' OR first_name LIKE '%${search}%' OR last_name LIKE '%${search}%') `;
    }

    if (active == 0 || active == 1) {
      const activeFlag = active == 0 ? false : true;
      condition += `AND is_enabled=${activeFlag} `;
    } else if (active == 3) {
      condition += `AND forum_ban=true `;
    }

    const offset = page * size;

    try {
      const usersCount = await User.getCount(req.con, condition).then(
        (rows) => rows[0].count
      );

      condition += `ORDER BY ${orderBy} LIMIT ${size} OFFSET ${offset} `;
      console.log(condition);
      User.get(req.con, condition, (error, rows) => {
        if (error) {
          res.status(500).send({
            response: "Ha ocurrido un error listando los users: " + error,
          });
        } else {
          console.log(usersCount);
          res
            .status(200)
            .send({ response: { data: rows, totalRows: usersCount } });
        }
      });
    } catch (error) {
      console.error("Ha ocurrido un error listando los users: ", error);
      throw error;
    }
  },

  searchUsers: (req, res) => {
    const { search } = req.query;
    let condition = `WHERE username LIKE '%${search}%'`;

    User.get(req.con, condition, (error, rows) => {
      if (error) {
        return res.status(500).send({
          response:
            "Ha ocurrido un error trayendo los usuarios error: " + error,
        });
      }
      return res.status(200).send({ response: rows });
    });
  },

  readUser: (req, res) => {
    const { id } = req.params;
    console.log(id);
    User.getById(req.con, id, (error, row) => {
      if (error) {
        res.status(500).send({
          response: "Ha ocurrido un error trayendo el usuario con id: " + id,
        });
      } else {
        delete row.rows[0].password;
        let dataUser = row.rows[0];
        res.status(200).send({ response: dataUser });
      }
    });
  },
  store: async (req, res) => {
    req.body.picture = "";

    if (!req.body.is_superuser) {
      req.body.is_superuser = false;
    }

    if (req.file) {
      req.body.picture = req.file.filename;
    }

    try {
      const userByUsername = await new Promise((resolve, reject) => {
        User.getByUsername(req.con, req.body.username, (error, row) => {
          if (error) return reject(error);
          resolve(row);
        });
      });

      if (userByUsername.length > 0) {
        if (req.body.picture) {
          removeFile(`users/${req.body.picture}`);
        }
        return res.status(400).send({
          response: {
            msg: "Ya está registrado este nombre de usuario",
            error: "username",
          },
        });
      }

      const userByEmail = await new Promise((resolve, reject) => {
        User.getByEmail(req.con, req.body.email, (error, row) => {
          if (error) return reject(error);
          resolve(row);
        });
      });

      if (userByEmail.length > 0) {
        if (req.body.picture) {
          removeFile(`users/${req.body.picture}`);
        }
        return res.status(400).send({
          response: { msg: "Ya está registrado este correo", error: "email" },
        });
      }

      const genSalt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, genSalt);
      req.body.ip = req.ip || req.ips;

      console.log(req.body);

      const savedUser = await new Promise((resolve, reject) => {
        User.saveUser(req.con, req.body, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
      });

      res.status(200).send({ response: savedUser });
    } catch (error) {
      console.error(error);
      if (req.body.picture) {
        removeFile(`users/${req.body.picture}`);
      }
      res.status(500).send({
        response:
          "Ha ocurrido un error registrando al usuario: " + error.message,
      });
    }
  },
  login: (req, res) => {
    const { username, password } = req.body;

    User.getByEmailOrUsername(req.con, username, async (error, row) => {
      console.log(row[0]);

      if (error) {
        res
          .status(500)
          .send({ response: "Ha ocurrido un error trayendo el usuario" });
      } else {
        if (row.length == 0) {
          return res.status(500).send({
            response: "No se encontro ningun usuario con estas credenciales",
          });
        }

        if (!row[0].is_enabled) {
          return res.status(403).send({
            response: "Tu cuenta ha sido deshabilitada",
          });
        }

        let passwordValid = false;

        if (isBcryptHash(row[0].password)) {
          passwordValid = await validateBcryptPassword(
            password,
            row[0].password
          );
        } else if (isPBKDF2Hash(row[0].password)) {
          const [, , iterations, salt, storedHash] = row[0].password.split("$");
          passwordValid = await validatePBKDF2Password(
            password,
            storedHash,
            salt,
            parseInt(iterations, 10)
          );
        }
        if (passwordValid) {
          const ip = req.ip || req.ips;
          User.updateLoginData(req.con, row[0].id, ip, (err, result) => {
            if (err) {
              console.log("Error guardando datos de login: " + err);
            } else {
              //console.log(result);
            }
          });

          delete row[0].password;
          const userData = row[0];
          return res.status(200).send({
            response: {
              token: createAccessToken(userData),
              refreshToken: createRefreshToken(userData),
              user: userData,
            },
          });
        } else {
          return res
            .status(500)
            .send({ response: "La contraseña no es correcta" });
        }
      }
    });
  },
  logout: (req, res) => {
    const { id } = req.body;

    console.log(id);

    User.updateLogoutData(req.con, id, (error, row) => {
      if (error) {
        return res
          .status(500)
          .send({ response: "Hubo un error al cerrar sesión" });
      } else {
        return res.status(200).send({
          response: "Cierre de sesión exitoso",
        });
      }
    });
  },
  delete: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const isAdmin = decodeToken(token).user.is_superuser;

    console.log(isAdmin);

    try {
      if (isAdmin) {
        User.delete(req.con, id, (error, row) => {
          if (error) {
            return res
              .status(500)
              .send({ response: "Error al eliminar el usuario" });
          } else {
            return res.status(200).send({ response: row });
          }
        });
      } else {
        return res.status(403).send({
          response: "No tienes permisos para realizar esta acción",
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).send({ response: "Error al eliminar el usuario" });
    }
  },
  forumBan: async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const isAdmin = decodeToken(token).user.is_superuser;

    console.log(isAdmin);

    try {
      if (isAdmin) {
        User.forumBan(req.con, id, value, (error, row) => {
          if (error) {
            return res
              .status(500)
              .send({ response: "Error al actualizar el usuario" });
          } else {
            return res.status(200).send({ response: row });
          }
        });
      } else {
        return res.status(403).send({
          response: "No tienes permisos para realizar esta acción",
        });
      }
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .send({ response: "Error al actualizar el usuario" });
    }
  },
  disable: async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const isAdmin = decodeToken(token).user.is_superuser;

    console.log(isAdmin);

    try {
      if (isAdmin) {
        User.disable(req.con, id, value, (error, row) => {
          if (error) {
            return res
              .status(500)
              .send({ response: "Error al actualizar el usuario" });
          } else {
            return res.status(200).send({ response: row });
          }
        });
      } else {
        return res.status(403).send({
          response: "No tienes permisos para realizar esta acción",
        });
      }
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .send({ response: "Error al actualizar el usuario" });
    }
  },
  update: async (req, res) => {
    const { id } = req.params;

    const fields = Object.keys(req.body)
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = Object.values(data);

    values.push(id);

    try {
      User.updateUser(req.con, fields, values, (error, row) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al actualizar el usuario" });
        } else {
          return res.status(200).send({ response: row });
        }
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .send({ response: "Error al actualizar el usuario" });
    }
  },
  usersLoggedInfo: async (req, res) => {
    try {
      const loggedUsers = await User.getLoggedUsers(req.con).then(
        (rows) => rows[0].count
      );

      const subsUsers = await User.getMembersUsers(req.con).then(
        (rows) => rows[0].count
      );
      return res
        .status(200)
        .send({ response: { logged: loggedUsers, subs: subsUsers } });
    } catch (error) {
      return res.status(500).send({
        response:
          "Ha ocurrido un error trayendo la cuenta de usuarios logueados y subscritos: " +
          error,
      });
    }
  },
};

const validateBcryptPassword = (passwordIngresada, hashedPassword) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(passwordIngresada, hashedPassword, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

const validatePBKDF2Password = (
  passwordIngresada,
  storedHash,
  salt,
  iterations
) => {
  return new Promise((resolve, reject) => {
    const keylen = 32;
    const digest = "sha256";

    crypto.pbkdf2(
      passwordIngresada,
      salt,
      iterations,
      keylen,
      digest,
      (err, derivedKey) => {
        if (err) reject(err);

        const derivedHash = derivedKey.toString("base64");
        resolve(derivedHash === storedHash);
      }
    );
  });
};

const isBcryptHash = (hashedPassword) =>
  hashedPassword.startsWith("$2a$") || hashedPassword.startsWith("$2b$");
const isPBKDF2Hash = (hashedPassword) =>
  hashedPassword.startsWith("pbkdf2_sha256$");
