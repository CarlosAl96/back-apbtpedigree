const User = require("../models/user");
const { createAccessToken, createRefreshToken } = require("../utils/jwt");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

module.exports = {
  index: async (req, res) => {
    const { page, size, search } = req.query;
    let condition = "";
    let offset = (page - 1) * size;

    if (search) {
      condition = ` WHERE name ILIKE '%${search}%' OR last_name ILIKE '%${search}%' OR email ILIKE '%${search}%'`;
    }

    const usersCount = await new Promise((resolve, reject) => {
      User.getCount(req.con, condition, (error, rows) => {
        if (error) {
          return reject(
            "Ha ocurrido un error trayendo el total de usuarios: " + error
          );
        }
        resolve(rows.rows[0].count);
      });
    });

    condition += ` LIMIT ${size} OFFSET ${offset}`;

    User.get(req.con, condition, (error, rows) => {
      if (error) {
        res.status(500).send({
          response: "Ha ocurrido un error listando los usuarios" + error,
        });
      } else {
        res
          .status(200)
          .send({ response: { data: rows.rows, totalRows: usersCount } });
      }
    });
  },
  readUser(req, res) {
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
    try {
      const userByUsername = await new Promise((resolve, reject) => {
        User.getByUsername(req.con, req.body.username, (error, row) => {
          if (error) return reject(error);
          resolve(row);
        });
      });

      if (userByUsername.length > 0) {
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

        let passwordValid = false;

        if (isBcryptHash(row[0].password)) {
          passwordValid = await validateBcryptPassword(
            password,
            row[0].password
          );
        } else if (isPBKDF2Hash(row[0].password)) {
          const [, , iterations, salt, storedHash] = row[0].password.split("$");
          passwordValid = await validatePBKDF2Password(
            passwordIngresada,
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
