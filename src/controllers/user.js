const User = require("../models/user");
const Payment = require("../models/payment");
const Pedigree = require("../models/pedigree");
const { createAccessToken, createRefreshToken } = require("../utils/jwt");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { decodeToken } = require("../utils/jwt");
const { removeFile } = require("../utils/dir");
const sendResetEmail = require("../utils/sendEmail");

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
    } else if (active == 4) {
      condition += `AND subscription=true `;
    }

    const offset = page * size;

    try {
      const usersCount = await User.getCount(req.con, condition).then(
        (rows) => rows[0].count
      );

      condition += `ORDER BY ${orderBy} LIMIT ${size} OFFSET ${offset} `;

      User.get(req.con, condition, (error, rows) => {
        if (error) {
          return res.status(500).send({
            response: "Ha ocurrido un error listando los users: " + error,
          });
        } else {
          return res
            .status(200)
            .send({ response: { data: rows, totalRows: usersCount } });
        }
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando los users: " + error,
      });
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
    } else {
      req.body.picture = "";
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
        return res.status(400).json({
          message: "username",
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
        return res.status(400).json({ message: "email" });
      }

      const genSalt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, genSalt);
      req.body.ip = req.ip || req.ips;

      const savedUser = await new Promise((resolve, reject) => {
        User.saveUser(req.con, req.body, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
      });

      res.status(200).send({ response: savedUser });
    } catch (error) {
      if (req.body.picture) {
        removeFile(`users/${req.body.picture}`);
      }
      return res.status(500).send({
        response:
          "Ha ocurrido un error registrando al usuario: " + error.message,
      });
    }
  },
  login: (req, res) => {
    const { username, password } = req.body;

    User.getByEmailOrUsername(req.con, username, async (error, row) => {
      if (error) {
        return res
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
          delete row[0].password;
          const userData = row[0];

          const ip = req.ip || req.ips;
          const token = createAccessToken(userData, false);

          await User.updateLoginData(req.con, row[0].id, ip).then(
            (rows) => rows
          );

          await User.deleteSession(req.con, row[0].id).then((rows) => rows);

          await User.saveSession(req.con, row[0].id, token).then(
            (rows) => rows
          );

          req.io.emit("login", { reload: true });
          return res.status(200).send({
            response: {
              token: token,
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
  logout: async (req, res) => {
    const { id } = req.body;

    try {
      await User.updateLogoutData(req.con, id).then((rows) => rows);

      await User.deleteSession(req.con, id).then((rows) => rows);

      req.io.emit("login", { reload: true });
      return res.status(200).send({
        response: "Cierre de sesión exitoso",
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error cerrando la sesión: " + error,
      });
    }
  },
  delete: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const isAdmin = decodeToken(token).user.is_superuser;

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
      return res.status(500).send({ response: "Error al eliminar el usuario" });
    }
  },
  forumBan: async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const isAdmin = decodeToken(token).user.is_superuser;

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
      return res
        .status(500)
        .send({ response: "Error al actualizar el usuario" });
    }
  },
  update: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const isAdmin = decodeToken(token).user.is_superuser;
    const idUser = decodeToken(token).user.id;

    User.getById(req.con, id, async (error, row) => {
      if (error) {
        return res
          .status(500)
          .send({ response: "Ha ocurrido un error trayendo el usuario" });
      } else {
        if (row.length == 0) {
          return res
            .status(404)
            .send({ response: "No se encontro ningun usuario con este id" });
        }

        if (row[0].id != idUser && !isAdmin) {
          return res.status(403).send({
            response: "No tienes permisos para realizar esta acción",
          });
        }
        if (req.file) {
          removeFile(`users/${row[0].picture}`);
          req.body.picture = req.file.filename;
        }

        if (req.body.password && isAdmin) {
          const genSalt = await bcrypt.genSalt(10);
          req.body.password = await bcrypt.hash(req.body.password, genSalt);
        } else {
          delete req.body.password;
        }

        const fields = Object.keys(req.body)
          .map((key) => `${key} = ?`)
          .join(", ");

        const values = Object.values(req.body);

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
          return res
            .status(500)
            .send({ response: "Error al actualizar el usuario" });
        }
      }
    });
  },
  usersLoggedInfo: async (req, res) => {
    try {
      const loggedUsers = await User.getLoggedUsers(req.con).then(
        (rows) => rows[0].count
      );

      return res.status(200).send({ response: { logged: loggedUsers } });
    } catch (error) {
      return res.status(500).send({
        response:
          "Ha ocurrido un error trayendo la cuenta de usuarios logueados y subscritos: " +
          error,
      });
    }
  },
  getByUsername: (req, res) => {
    const { username } = req.params;

    User.getByUsername(req.con, username, (error, row) => {
      if (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el usuario con id: " + id,
        });
      } else {
        if (row.length == 0) {
          return res.status(404).send({
            response: "No se encontro ningun usuario con este username",
          });
        }
        delete row[0].password;
        if (!row[0].show_phone) {
          row[0].phone_number = "";
        }
        if (!row[0].show_email) {
          row[0].email = "";
        }

        if (!row[0].show_location) {
          row[0].street = "";
          row[0].city = "";
          row[0].state = "";
          row[0].country = "";
          row[0].zip_code = "";
        }

        return res.status(200).send({ response: row[0] });
      }
    });
  },
  forgotPassword: (req, res) => {
    const { username } = req.body;

    User.getByEmailOrUsername(req.con, username, async (error, row) => {
      if (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el usuario",
        });
      } else {
        if (row.length == 0) {
          return res.status(404).send({
            response: "No se encontro ningun usuario con este email",
          });
        }

        const token = createAccessToken(row[0], true);

        await User.deleteTokenByUserIdResetPassword(req.con, row[0].id);

        User.saveTokenResetPassword(
          req.con,
          { user_id: row[0].id, token },
          async (err, result) => {
            if (err) {
              return res.status(500).send({
                response: "Ha ocurrido un error guardando el token: " + err,
              });
            } else {
              await sendResetEmail(row[0].email, token);
              return res.status(200).send({
                response: "Email sended",
              });
            }
          }
        );
      }
    });
  },

  updatePassword: (req, res) => {
    const { id } = req.params;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const idUser = decodeToken(token).user.id;

    if (idUser != id) {
      return res.status(403).send({
        response: "No tienes permisos para realizar esta acción",
      });
    }

    User.getById(req.con, id, async (error, row) => {
      if (error) {
        return res
          .status(500)
          .send({ response: "Ha ocurrido un error trayendo el usuario" });
      } else {
        if (row.length == 0) {
          return res.status(404).send({
            response: "No se encontro ningun usuario con estas credenciales",
          });
        }

        let passwordValid = false;

        if (isBcryptHash(row[0].password)) {
          passwordValid = await validateBcryptPassword(
            req.body.oldPassword,
            row[0].password
          );
        } else if (isPBKDF2Hash(row[0].password)) {
          const [, , iterations, salt, storedHash] = row[0].password.split("$");
          passwordValid = await validatePBKDF2Password(
            req.body.oldPassword,
            storedHash,
            salt,
            parseInt(iterations, 10)
          );
        }
        if (passwordValid) {
          const genSalt = await bcrypt.genSalt(10);
          const newPassword = await bcrypt.hash(req.body.newPassword, genSalt);

          User.updateUser(
            req.con,
            `password = '${newPassword}'`,
            row[0].id,
            async (err, result) => {
              if (err) {
                return res.status(500).send({
                  response: "Ha ocurrido un error actualizando la contraseña",
                });
              } else {
                await User.deleteTokenResetPassword(req.con, token);
                return res.status(200).send({
                  response: "Contraseña actualizada",
                });
              }
            }
          );
        } else {
          return res
            .status(500)
            .send({ response: "La contraseña no es correcta" });
        }
      }
    });
  },

  changePassword: (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    const dataToken = decodeToken(token);

    if (dataToken.exp < new Date().getTime()) {
      return res.status(401).send({ response: "El token ha expirado" });
    }

    User.getTokenResetPassword(req.con, token, async (error, row) => {
      if (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el token",
        });
      } else {
        if (row.length == 0) {
          return res.status(500).send({
            response: "No se encontro ningun token",
          });
        }

        const genSalt = await bcrypt.genSalt(10);
        const newPassword = await bcrypt.hash(password, genSalt);

        User.updateUser(
          req.con,
          `password = '${newPassword}'`,
          row[0].user_id,
          async (err, result) => {
            if (err) {
              return res.status(500).send({
                response: "Ha ocurrido un error actualizando la contraseña",
              });
            } else {
              await User.deleteTokenResetPassword(req.con, token);
              return res.status(200).send({
                response: "Contraseña actualizada",
              });
            }
          }
        );
      }
    });
  },

  dashboardData: async (req, res) => {
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const isAdmin = decodeToken(token).user.is_superuser;

    if (!isAdmin) {
      return res.status(403).send({
        response: "No estás autorizado",
      });
    }

    try {
      const users = await User.getCount(req.con, "").then(
        (rows) => rows[0].count
      );

      const payments = await Payment.getCount(req.con, "").then(
        (rows) => rows[0].count
      );

      const pedigrees = await Pedigree.getCount(req.con, "").then(
        (rows) => rows[0].count
      );

      const paymentsData = await Payment.getData(req.con).then((rows) => rows);

      const usersData = await User.getData(req.con).then((rows) => rows);

      return res.status(200).send({
        response: {
          users: users,
          payments: payments,
          pedigrees: pedigrees,
          paymentsData: paymentsData,
          usersData: usersData,
        },
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error trayendo los datos: " + error,
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
