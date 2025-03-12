const chat = require("../models/chat");
const message = require("../models/message");
const { decodeToken } = require("../utils/jwt");

module.exports = {
  get: (req, res) => {
    const { id_chat, page, size } = req.query;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    chat.getById(req.con, id_chat, (error, result) => {
      if (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el chat: " + error,
        });
      }

      if (!result.length) {
        return res.status(400).send({
          response: "Ha ocurrido un error trayendo el chat ",
        });
      }

      if (
        result[0].id_user_one == user.id ||
        result[0].id_user_two == user.id
      ) {
        getMessages(req, id_chat, page, size, res);
      } else {
        return res.status(403).send({
          response: "No estas autorizado",
        });
      }
    });
  },
  store: async (req, res) => {
    if (req.body.id_chat == 0) {
      const existChat = await chat
        .getExistChat(req.con, req.body.id_sender, req.body.id_receiver)
        .then((rows) => rows[0]);
      let condition = "";
      if (existChat) {
        if (req.body.id_sender == existChat.id_user_one) {
          condition = "is_deleted_one=false, viewed_two=false";
        }
        if (req.body.id_sender == existChat.id_user_two) {
          condition = "is_deleted_two=false, viewed_one=false";
        }

        chat.update(
          req.con,
          `update chat set ${condition} where id=${existChat.id}`,
          (err, ress) => {
            if (err) {
              return res.status(500).send({
                response: "Ha ocurrido un error actualizando el chat: " + err,
              });
            }
            req.body.id_chat = existChat.id;
            message.store(req.con, req.body, (err, result) => {
              if (err) {
                return res.status(500).send({
                  response: "Ha ocurrido un error creando el mensaje: " + err,
                });
              } else {
                req.io.emit("messages", {
                  id_chat: existChat.id,
                  id_sender: req.body.id_sender,
                });
                req.io.emit("getChats", {
                  id_one: existChat.id_user_one,
                  id_two: existChat.id_user_rwo,
                });

                return res.status(200).send({ response: existChat.id });
              }
            });
          }
        );
      } else {
        chat.store(
          req.con,
          {
            id_user_one: req.body.id_sender,
            id_user_two: req.body.id_receiver,
            viewed_one: true,
            viewed_two: false,
            is_deleted_one: false,
            is_deleted_two: false,
          },
          (err, result) => {
            if (err) {
              return res.status(500).send({
                response: "Ha ocurrido un error creando el mensaje: " + err,
              });
            }
            req.body.id_chat = result.insertId;
            message.store(req.con, req.body, (err, result) => {
              if (err) {
                return res.status(500).send({
                  response: "Ha ocurrido un error creando el mensaje: " + err,
                });
              } else {
                req.io.emit("messages", {
                  id_chat: req.body.id_chat,
                  id_sender: req.body.id_sender,
                });
                req.io.emit("getChats", {
                  id_one: req.body.id_sender,
                  id_two: req.body.id_receiver,
                });

                return res.status(200).send({ response: result.insertId });
              }
            });
          }
        );
      }
    } else {
      if (req.body.im_first) {
        condition = "viewed_two=false";
      } else {
        condition = "viewed_one=false";
      }

      chat.update(
        req.con,
        `update chat set ${condition} where id=${req.body.id_chat}`,
        () => {
          message.store(req.con, req.body, (err, result) => {
            if (err) {
              return res.status(500).send({
                response: "Ha ocurrido un error creando el mensaje: " + err,
              });
            } else {
              req.io.emit("messages", {
                id_chat: req.body.id_chat,
                id_sender: req.body.id_sender,
              });
              req.io.emit("getChats", {
                id_one: req.body.id_sender,
                id_two: req.body.id_receiver,
              });
              return res.status(200).send({ response: req.body.id_chat });
            }
          });
        }
      );
    }
  },

  delete: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    const msg = await message.getById(req.con, id).then((rows) => rows[0]);

    if (!msg) {
      return res.status(404).send({
        response: "Mesanje no encontrado",
      });
    }

    if (user.id != msg.id_sender) {
      return res.status(403).send({
        response: "No estas autorizado",
      });
    }

    message.delete(req.con, id, user.id, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error eliminando el mensaje: " + err,
        });
      }
      req.io.emit("messages", {
        id_chat: msg.id_chat,
        id_sender: msg.id_sender,
      });
      req.io.emit("getChats", {
        id_one: msg.id_sender,
        id_two: msg.id_receiver,
      });
      return res.status(200).send({ response: "success" });
    });
  },
};

async function getMessages(req, id_chat, page, size, res) {
  const offset = page * size;

  const messagesCount = await message
    .getCount(req.con, id_chat)
    .then((rows) => rows[0].count);

  message.get(req.con, { id_chat, size, offset }, (error, rows) => {
    if (error) {
      return res
        .status(500)
        .send({ response: "Ha ocurrido un error listando los mensajes" });
    } else {
      return res
        .status(200)
        .send({ response: { data: rows, totalRows: messagesCount } });
    }
  });
}
