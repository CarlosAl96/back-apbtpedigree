const Payment = require("../models/payment");
const Stream = require("../models/stream");
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

    let condition = "WHERE 1=1 ";

    if (search) {
      condition += `AND (title LIKE '%${search}%' OR username LIKE '%${search}%') `;
    }

    const offset = page * size;

    try {
      const paymentsCount = await Payment.getCount(req.con, condition).then(
        (rows) => rows[0].count
      );

      condition += ` ORDER BY id DESC LIMIT ${size} OFFSET ${offset} `;

      Payment.get(req.con, condition, (error, rows) => {
        if (error) {
          return res.status(500).send({
            response: "Ha ocurrido un error listando los payments: " + error,
          });
        } else {
          return res
            .status(200)
            .send({ response: { data: rows, totalRows: paymentsCount } });
        }
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando los payments: " + error,
      });
    }
  },

  paymentVerify: (req, res) => {
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;
    const isAdmin = user.is_superuser;

    Stream.getActive(req.con, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el stream " + err,
        });
      }

      if (isAdmin) {
        return res.status(200).send({
          response: {
            isPaid: true,
            isAdmin: true,
            isStreamActive: result.length ? true : false,
            isLive: result.length ? (result[0].is_live ? true : false) : false,
          },
        });
      }

      if (!result.length) {
        return res.status(404).send({
          response: "No hay streams activos",
        });
      }

      const verify = await Payment.verify(req.con, result[0].id, user.id).then(
        (rows) => rows[0].has_paid
      );

      return res.status(200).send({
        response: {
          isPaid: verify ? true : false,
          isAdmin: false,
          isStreamActive: true,
          isLive: result[0].is_live ? true : false,
          stream: result[0],
        },
      });
    });
  },

  store: async (req, res) => {},
};
