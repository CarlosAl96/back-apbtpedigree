const axios = require("axios");
const Payment = require("../models/payment");
const Stream = require("../models/stream");
const { decodeToken } = require("../utils/jwt");
require("dotenv").config();

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

      if (result[0].price == 0) {
        return res.status(200).send({
          response: {
            isPaid: true,
            isAdmin: false,
            isFree: true,
            isStreamActive: true,
            isLive: result[0].is_live,
            stream: result[0],
          },
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
  createOrder: async (req, res) => {
    try {
      const order = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: req.body.price.toString(),
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: req.body.price.toString(),
                },
              },
            },
            items: [
              {
                name: req.body.title,
                quantity: "1",
                category: "DIGITAL_GOODS",
                unit_amount: {
                  currency_code: "USD",
                  value: req.body.price.toString(),
                },
              },
            ],
          },
        ],
      };

      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");

      const responseAuth = await axios.post(
        `${process.env.PAYPAL_SANDBOX_API}/v1/oauth2/token`,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_SECRET,
          },
        }
      );

      const response = await axios.post(
        `${process.env.PAYPAL_SANDBOX_API}/v2/checkout/orders`,
        order,
        {
          headers: {
            Authorization: `Bearer ${responseAuth.data.access_token}`,
          },
        }
      );

      return res.status(200).send({ response: response.data });
    } catch (error) {
      console.log(error);

      return res.status(500).send("Something goes wrong ERROR: " + error);
    }
  },
  store: async (req, res) => {
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    const { order, stream } = req.body;

    try {
      const response = await axios.get(
        `${process.env.PAYPAL_SANDBOX_API}/v2/checkout/orders/${order}`,
        {
          auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_SECRET,
          },
        }
      );

      if (response.data.status == "COMPLETED") {
        const payInfo = {
          user_id: user.id,
          stream_id: stream.id,
          amount: stream.price,
          payment_method: "PayPal",
          transaction_id: order,
          payment_status: response.data.status,
        };

        Payment.store(req.con, payInfo, (error, result) => {
          if (error) {
            return res
              .status(500)
              .json({ message: "Internal Server error ERROR: " + error });
          }
          return res.status(200).send({ response: "success" });
        });
      } else {
        return res.status(400).send({ response: "not paid" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal Server error ERROR: " + error });
    }
  },
};
