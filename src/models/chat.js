module.exports = {
  get: (con, id_user, callback) => {
    con.query(
      `SELECT chat.*, u1.username AS username_one, u1.picture AS img_one, u2.username AS username_two, u2.picture AS img_two FROM chat INNER JOIN users u1 ON chat.id_user_one = u1.id INNER JOIN users u2 ON chat.id_user_two = u2.id where id_user_one=${id_user} OR  id_user_two=${id_user}`,
      callback
    );
  },
  getChatsCountUnviewed: (con, id_user, callback) => {
    con.query(
      `SELECT chat.*, u1.username AS username_one, u1.picture AS img_one, u2.username AS username_two, u2.picture AS img_two FROM chat INNER JOIN users u1 ON chat.id_user_one = u1.id INNER JOIN users u2 ON chat.id_user_two = u2.id where (id_user_one=${id_user} AND viewed_one=0) OR (id_user_two=${id_user} AND viewed_two=0)`,
      callback
    );
  },
  getById: (con, id, callback) => {
    con.query(`SELECT * from chat where id =${id}`, callback);
  },
  getExistChat: (con, idOne, idTwo) => {
    return con
      .promise()
      .query(
        `SELECT * FROM chat where id_user_one=${idOne} AND id_user_two=${idTwo} LIMIT 1`
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
      `insert into chat (id_user_one,id_user_two,viewed_one,viewed_two,is_deleted_one,is_deleted_two) values (${data.id_user_one},${data.id_user_two},${data.viewed_one},${data.viewed_two},${data.is_deleted_one},${data.is_deleted_two})`,
      callback
    );
  },
};
