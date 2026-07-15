const chat = require("../models/chat");
const message = require("../models/message");
const { decodeToken } = require("../utils/jwt");

async function addLastMessages(req, results) {
  const chatIds = results.map((chat) => chat.id);
  const lastMessages = await message.getLastByChatIds(req.con, chatIds);
  const lastMessagesByChatId = new Map(
    lastMessages.map((lastMessage) => [lastMessage.id_chat, lastMessage])
  );

  results.forEach((chat) => {
    chat.last_message = lastMessagesByChatId.get(chat.id) || null;
  });

  if (results.length > 1) {
    results.sort((a, b) => (b.last_message?.id || 0) - (a.last_message?.id || 0));
  }

  return results;
}

module.exports = {
  get: (req, res) => {
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    chat.get(req.con, user.id, async (err, results) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo los chats: " + err,
        });
      }
      try {
        results = await addLastMessages(req, results);
      } catch (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo los mensajes: " + error,
        });
      }

      return res.status(200).send({ response: results });
    });
  },
  getSupport: (req, res) => {
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    chat.getSupport(req.con, user.id, user.id === 1, async (err, results) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo los chats de soporte: " + err,
        });
      }

      try {
        results = await addLastMessages(req, results);
      } catch (error) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo los mensajes: " + error,
        });
      }

      return res.status(200).send({ response: results });
    });
  },
  getChatsCount: (req, res) => {
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    chat.getChatsCountUnviewed(req.con, user.id, async (err, results) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo los chats: " + err,
        });
      }

      return res
        .status(200)
        .send({ response: results.length ? results.length : 0 });
    });
  },
  delete: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    var idDeleteFull = false;
    var condition = "";

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;
    try {
      var chatResult = await new Promise((resolve, reject) => {
        chat.getById(req.con, id, (err, result) => {
          if (err) {
            return reject("Ha ocurrido un error: " + err);
          }
          resolve(result[0]);
        });
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error eliminando el chat: " + error,
      });
    }
    if (typeof chatResult == "string") {
      return res.status(500).send({
        response: "Ha ocurrido un error eliminando el chat: " + chatResult,
      });
    }
    if (!chatResult) {
      return res.status(200).send({ response: "success" });
    }

    if (chatResult.chat_type === "support" && user.id === 1) {
      chat.deleteMessagesChat(req.con, id, (err) => {
        if (err) {
          return res.status(500).send({
            response: "Ha ocurrido un error eliminando el chat: " + err,
          });
        }

        chat.delete(req.con, id, (err, result) => {
          if (err) {
            return res.status(500).send({
              response: "Ha ocurrido un error eliminando el chat: " + err,
            });
          }

          req.io.emit("supportChat", {
            id_one: chatResult.id_user_one,
            id_two: chatResult.id_user_two,
            chat_type: "support",
          });

          return res.status(200).send({ response: "success" });
        });
      });
      return;
    }

    if (
      user.id != chatResult.id_user_one &&
      user.id != chatResult.id_user_two
    ) {
      return res.status(403).send({
        response: "No estas autorizado",
      });
    }

    if (user.id == chatResult.id_user_one) {
      condition = "is_deleted_one=true";
      if (chatResult.is_deleted_two) {
        idDeleteFull = true;
      }
    }
    if (user.id == chatResult.id_user_two) {
      condition = "is_deleted_two=true";
      if (chatResult.is_deleted_one) {
        idDeleteFull = true;
      }
    }
    if (
      user.id == chatResult.id_user_one &&
      user.id == chatResult.id_user_two
    ) {
      idDeleteFull = true;
    }
    if (!idDeleteFull) {
      chat.update(
        req.con,
        `update chat set ${condition} where id=${id}`,
        (err, result) => {
          if (err) {
            return res.status(500).send({
              response: "Ha ocurrido un error eliminando el chat: " + err,
            });
          }
          if (chatResult.chat_type === "support") {
            req.io.emit("supportChat", {
              id_one: chatResult.id_user_one,
              id_two: chatResult.id_user_two,
              chat_type: "support",
            });
          }
          res.status(200).send({ response: "success" });
        }
      );
    } else {
      chat.delete(req.con, id, async (err, result) => {
        if (err) {
          return res.status(500).send({
            response: "Ha ocurrido un error eliminando el chat: " + err,
          });
        }
        var messagesDelete = await new Promise((resolve, reject) => {
          chat.deleteMessagesChat(req.con, id, (err, result) => {
            if (err) {
              return reject("Ha ocurrido un error: " + err);
            }
            resolve(result[0]);
          });
        });
        return res.status(200).send({ response: "success" });
      });
    }
  },
  viewChat: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    var condition = "";

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      var chatResult = await new Promise((resolve, reject) => {
        chat.getById(req.con, id, (err, result) => {
          if (err) {
            return reject("Ha ocurrido un error: " + err);
          }
          resolve(result[0]);
        });
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error actualizando el chat: " + error,
      });
    }

    if (!chatResult) {
      return res.status(200).send({ response: "success" });
    }

    if (user.id == chatResult.id_user_one) {
      condition = `viewed_one=true`;
    }
    if (user.id == chatResult.id_user_two) {
      condition = `viewed_two=true`;
    }
    if (!condition) {
      return res.status(403).send({
        response: "No estas autorizado",
      });
    }

    chat.update(
      req.con,
      `update chat set ${condition} where id=${id}`,
      (err, result) => {
        if (err) {
          return res.status(500).send({
            response: "Ha ocurrido un error actualizando el chat: " + err,
          });
        }

        req.io.emit("getChats", {
          id_one: chatResult.id_user_one,
          id_two: chatResult.id_user_two,
        });

        return res.status(200).send({ response: "success" });
      }
    );
  },
};
