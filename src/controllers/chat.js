const chat = require("../models/chat");
const message = require("../models/message");
const { decodeToken } = require("../utils/jwt");
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
      for (var i = 0; i < results.length; i++) {
        var messageResult = await new Promise((resolve, reject) => {
          message.getByIdChat(req.con, results[i].id, (err, result) => {
            if (err) {
              return reject("Ha ocurrido un error: " + err);
            }
            resolve(result[0]);
          });
        });
        results[i].last_message = messageResult;
      }
      if (results.length > 1) {
        results.sort((a, b) => b.last_message.id - a.last_message.id);
      }

      return res.status(200).send({ response: results });
    });
  },
  delete: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    var idDeleteFull = false;
    var condition = "";

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;
    var chatResult = await new Promise((resolve, reject) => {
      chat.getById(req.con, id, (err, result) => {
        if (err) {
          return reject("Ha ocurrido un error: " + err);
        }
        resolve(result[0]);
      });
    });
    if (typeof chatResult == "string") {
      return res.status(500).send({
        response: "Ha ocurrido un error eliminando el chat: " + chatResult,
      });
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

    var chatResult = await new Promise((resolve, reject) => {
      chat.getById(req.con, id, (err, result) => {
        if (err) {
          return reject("Ha ocurrido un error: " + err);
        }
        resolve(result[0]);
      });
    });

    if (!chatResult) {
      return res.status(200).send({ response: "success" });
    }

    if (user.id == chatResult.id_user_one) {
      condition = `viewed_one=true`;
    }
    if (user.id == chatResult.id_user_two) {
      condition = `viewed_two=true`;
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

        return res.status(200).send({ response: "success" });
      }
    );
  },
};
