const chat = require("../models/chat");
const StreamMessage = require("../models/streamMessage");
const { decodeToken } = require("../utils/jwt");

module.exports = {
  get: (req, res) => {
    StreamMessage.getByIdStream(req.con, (error, results) => {
      if (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el chat: " + error,
        });
      }

      return res.status(200).send({
        response: results,
      });
    });
  },
  delete: (req, res) => {
    const { id } = req.params;
    StreamMessage.delete(req.con, id)
      .then((result) => {
        req.io.emit("streamMessageDeleted", {
          id: id,
        });

        return res.status(200).send({
          response: result,
        });
      })
      .catch((error) => {
        return res.status(500).send({
          response: "Ha ocurrido un error eliminando el mensaje: " + error,
        });
      });
  },
  store: (req, res) => {
    StreamMessage.store(req.con, req.body, (error, result) => {
      if (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error enviando el mensaje: " + error,
        });
      }
      req.io.emit("streamMessage", {
        id: result.insertId,
        user_id: req.body.user_id,
        username: req.body.username,
        message: req.body.message,
        updated_at: req.body.updated_at,
        created_at: req.body.created_at,
      });
      return res.status(200).send({
        response: result,
      });
    });
  },
};
