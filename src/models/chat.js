module.exports = {
  get: (con, id_user, callback) => {
    con.query(
      `SELECT chat.*, u1.username AS username_one, u1.picture AS img_one, u2.username AS username_two, u2.picture AS img_two FROM chat INNER JOIN users u1 ON chat.id_user_one = u1.id INNER JOIN users u2 ON chat.id_user_two = u2.id where (id_user_one=${id_user} OR id_user_two=${id_user}) AND chat.chat_type='private'`,
      callback
    );
  },
  getChatsCountUnviewed: (con, id_user, callback) => {
    con.query(
      `SELECT chat.*, u1.username AS username_one, u1.picture AS img_one, u2.username AS username_two, u2.picture AS img_two FROM chat INNER JOIN users u1 ON chat.id_user_one = u1.id INNER JOIN users u2 ON chat.id_user_two = u2.id where ((id_user_one=${id_user} AND viewed_one=0) OR (id_user_two=${id_user} AND viewed_two=0)) AND chat.chat_type='private'`,
      callback
    );
  },
  getSupport: (con, id_user, isAdmin, callback) => {
    const condition = isAdmin
      ? "chat.chat_type='support' AND (id_user_one=1 OR id_user_two=1)"
      : `chat.chat_type='support' AND (id_user_one=1 OR id_user_two=1) AND ((id_user_one=${id_user} AND is_deleted_one=false) OR (id_user_two=${id_user} AND is_deleted_two=false))`;

    con.query(
      `SELECT chat.*, u1.username AS username_one, u1.picture AS img_one, u2.username AS username_two, u2.picture AS img_two FROM chat INNER JOIN users u1 ON chat.id_user_one = u1.id INNER JOIN users u2 ON chat.id_user_two = u2.id WHERE ${condition}`,
      callback
    );
  },
  getById: (con, id, callback) => {
    con.query(`SELECT * from chat where id =${id}`, callback);
  },
  getExistChat: (con, idOne, idTwo, chatType = "private") => {
    return con
      .promise()
      .query(
        `SELECT * FROM chat where ((id_user_one=${idOne} AND id_user_two=${idTwo}) OR (id_user_one=${idTwo} AND id_user_two=${idOne})) AND chat_type='${chatType}' LIMIT 1`
      )
      .then(([rows]) => rows);
  },
  update: (con, query, callback) => {
    con.query(query, callback);
  },
  delete: (con, id, callback) => {
    con.query("delete from chat where id= " + id, callback);
  },
  deleteMessagesChat: (con, id, callback) => {
    con.query("delete from message where id_chat= " + id, callback);
  },
  store: (con, data, callback) => {
    con.query(
      `insert into chat (id_user_one,id_user_two,viewed_one,viewed_two,is_deleted_one,is_deleted_two,chat_type) values (${data.id_user_one},${data.id_user_two},${data.viewed_one},${data.viewed_two},${data.is_deleted_one},${data.is_deleted_two},'${data.chat_type || "private"}')`,
      callback
    );
  },
};
