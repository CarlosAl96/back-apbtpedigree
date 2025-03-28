const Stream = require("../models/stream");
const Payment = require("../models/payment");
const StreamMessage = require("../models/streamMessage");
const axios = require("axios");
const User = require("../models/user");
const path = require("path");

const { decodeToken } = require("../utils/jwt");

module.exports = {
  get: async (req, res) => {
    const { page, size, search } = req.query;
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!user.is_superuser) {
      return res.status(403).send({
        response: "No tienes permisos para realizar esta acción",
      });
    }

    let condition = "WHERE is_completed=true ";

    if (search) {
      condition += `AND (title LIKE '%${search}%' OR description LIKE '%${search}%') `;
    }

    const offset = page * size;

    try {
      const streamCount = await Stream.getCount(req.con, condition).then(
        (rows) => rows[0].count
      );

      condition += ` ORDER BY id DESC LIMIT ${size} OFFSET ${offset} `;

      Stream.get(req.con, condition, (error, rows) => {
        if (error) {
          return res.status(500).send({
            response: "Ha ocurrido un error listando los streams: " + error,
          });
        } else {
          res
            .status(200)
            .send({ response: { data: rows, totalRows: streamCount } });
        }
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando los streams: " + error,
      });
    }
  },

  getActive: (req, res) => {
    Stream.getActive(req.con, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el stream " + err,
        });
      }

      if (!result.length) {
        return res.status(404).send({
          response: "No hay streams activos",
        });
      }
      return res.status(200).send({
        response: result[0],
      });
    });
  },

  store: async (req, res) => {
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!req.body.price) {
      req.body.price = 0;
    }

    if (!user.is_superuser) {
      return res.status(403).send({
        response: "No tienes permisos para realizar esta acción",
      });
    }

    const condition = " WHERE is_completed=false ";

    const streamCount = await Stream.getCount(req.con, condition).then(
      (rows) => rows[0].count
    );

    if (streamCount > 0) {
      return res.status(400).send({
        response: "Ya hay un stream activo",
      });
    }

    Stream.store(req.con, req.body, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error creando el stream " + err,
        });
      }
      req.io.emit("announce", {});
      return res.status(200).send({
        response: result,
      });
    });
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!user.is_superuser) {
      return res.status(403).send({
        response: "No tienes permisos para realizar esta acción",
      });
    }

    const fields = Object.keys(req.body)
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = Object.values(req.body);

    values.push(id);

    try {
      Stream.update(req.con, fields, values, (error, row) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al actualizar el stream" });
        } else {
          req.io.emit("reprogramed", {});
          return res.status(200).send({ response: row });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el stream" });
    }
  },

  proxy: async (req, res) => {
    const { token } = req.params;
    const origin = req.headers.origin || req.headers.referer || "";

    if (origin != process.env.FRONTEND_URL) {
      return res.status(403).send({ response: "No estás autorizado" });
    }

    const session = await User.getSession(req.con, token);

    if (session.length === 0) {
      return res.status(401).send({ response: "El token es inválido" });
    }

    if (decodeToken(token).exp < new Date().getTime()) {
      return res.status(401).send({ response: "El token ha expirado" });
    }

    Stream.getActive(req.con, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el stream " + err,
        });
      }

      if (!result.length) {
        return res.status(404).send({
          response: "No hay streams activos",
        });
      }

      try {
        res.redirect(result[0].url);
      } catch (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el stream " + error,
        });
      }
    });
  },

  setLive: (req, res) => {
    const { id } = req.params;
    const { value, init, end } = req.body;
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!user.is_superuser) {
      return res.status(403).send({
        response: "No tienes permisos para realizar esta acción",
      });
    }

    if (value) {
      Stream.setLive(req.con, id, init, (error, result) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al actualizar el stream: " + error });
        } else {
          req.io.emit("live", {});
          return res.status(200).send({ response: "succes" });
        }
      });
    } else {
      Stream.setUnlive(req.con, id, end, (error, result) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al actualizar el stream: " + error });
        } else {
          Stream.setComplete(req.con, id, async (error, ress) => {
            if (error) {
              return res
                .status(500)
                .send({ response: "Error al actualizar el stream" });
            }
            // const streamMessageCount = await StreamMessage.getCount(
            //   req.con,
            //   id
            // ).then((rows) => rows[0].count);
            const paymentsCount = await Payment.getCountByStream(
              req.con,
              id
            ).then((rows) => rows[0].count);

            // await StreamMessage.deleteByStream(req.con, id);
            await Stream.setCountsPaymentsMessages(req.con, paymentsCount, id);

            req.io.emit("unlive", {});
            return res.status(200).send({ response: "succes" });
          });
        }
      });
    }
  },

  reAnnounce: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!user.is_superuser) {
      return res.status(403).send({
        response: "No tienes permisos para realizar esta acción",
      });
    }

    const condition = " WHERE is_completed=false ";

    const streamCount = await Stream.getCount(req.con, condition).then(
      (rows) => rows[0].count
    );

    if (streamCount > 0) {
      return res.status(400).send({
        response: "Ya hay un stream activo",
      });
    }

    Stream.reAnnounce(req.con, id, (error, ress) => {
      if (error) {
        return res
          .status(500)
          .send({ response: "Error al actualizar el stream" });
      } else {
        req.io.emit("announce", {});
        return res.status(200).send({ response: "succes" });
      }
    });
  },
};
