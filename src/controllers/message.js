const chat = require("../models/chat");
const message = require("../models/message");
const { decodeToken } = require("../utils/jwt");

function emitChatEvents(req, idOne, idTwo, chatType) {
  const event = chatType === "support" ? "supportChat" : "getChats";

  req.io.emit(event, {
    id_one: idOne,
    id_two: idTwo,
    chat_type: chatType,
  });
}

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
    const chatType = req.body.chat_type || "private";

    if (
      chatType === "support" &&
      Number(req.body.id_sender) !== 1 &&
      Number(req.body.id_receiver) !== 1
    ) {
      return res.status(403).send({
        response: "No estas autorizado",
      });
    }

    if (req.body.id_chat == 0) {
      try {
        var existChat = await chat
          .getExistChat(
            req.con,
            req.body.id_sender,
            req.body.id_receiver,
            chatType
          )
          .then((rows) => rows[0]);

        if (
          chatType === "support" &&
          existChat &&
          ((req.body.id_sender == existChat.id_user_one &&
            existChat.is_deleted_one) ||
            (req.body.id_sender == existChat.id_user_two &&
              existChat.is_deleted_two))
        ) {
          existChat = null;
        }
      } catch (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el chat: " + error,
        });
      }
      let condition = "";
      if (existChat) {
        if (req.body.id_sender == existChat.id_user_one) {
          condition =
            chatType === "support"
              ? "is_deleted_one=false, is_deleted_two=false, viewed_two=false"
              : "is_deleted_one=false, viewed_two=false";
        }
        if (req.body.id_sender == existChat.id_user_two) {
          condition =
            chatType === "support"
              ? "is_deleted_one=false, is_deleted_two=false, viewed_one=false"
              : "is_deleted_two=false, viewed_one=false";
        }
        if (!condition) {
          return res.status(403).send({
            response: "No estas autorizado",
          });
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
                  chat_type: chatType,
                });
                emitChatEvents(
                  req,
                  existChat.id_user_one,
                  existChat.id_user_two,
                  chatType
                );

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
            chat_type: chatType,
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
                  chat_type: chatType,
                });
                emitChatEvents(
                  req,
                  req.body.id_sender,
                  req.body.id_receiver,
                  chatType
                );

                return res.status(200).send({ response: req.body.id_chat });
              }
            });
          }
        );
      }
    } else {
      if (req.body.im_first) {
        condition =
          chatType === "support"
            ? "is_deleted_two=false, viewed_two=false"
            : "viewed_two=false";
      } else {
        condition =
          chatType === "support"
            ? "is_deleted_one=false, viewed_one=false"
            : "viewed_one=false";
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
                chat_type: chatType,
              });
              emitChatEvents(
                req,
                req.body.id_sender,
                req.body.id_receiver,
                chatType
              );
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

    const chatResult = await new Promise((resolve, reject) => {
      chat.getById(req.con, msg.id_chat, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result[0]);
      });
    });

    const canDeleteAsSupportAdmin =
      user.id === 1 && chatResult?.chat_type === "support";

    if (user.id != msg.id_sender && !canDeleteAsSupportAdmin) {
      return res.status(403).send({
        response: "No estas autorizado",
      });
    }

    const onDeleted = async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error eliminando el mensaje: " + err,
        });
      }
      req.io.emit("messages", {
        id_chat: msg.id_chat,
        id_sender: msg.id_sender,
        chat_type: chatResult?.chat_type || "private",
      });

      emitChatEvents(
        req,
        chatResult?.id_user_one || msg.id_sender,
        chatResult?.id_user_two || msg.id_receiver,
        chatResult?.chat_type || "private"
      );
      return res.status(200).send({ response: "success" });
    };

    if (canDeleteAsSupportAdmin) {
      message.deleteByAdmin(req.con, id, onDeleted);
    } else {
      message.delete(req.con, id, user.id, onDeleted);
    }
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
