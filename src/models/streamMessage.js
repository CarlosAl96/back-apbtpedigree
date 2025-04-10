module.exports = {
  getByIdStream: (con, callback) => {
    con.query(
      `SELECT stream_chat_messages.*, users.username FROM stream_chat_messages INNER JOIN users ON users.id=stream_chat_messages.user_id ORDER BY id DESC LIMIT 500`,
      callback
    );
  },
  getCount: (con, idStream) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM stream_chat_messages WHERE stream_id=${idStream}`
      )
      .then(([rows]) => rows);
  },

  store: (con, data, callback) => {
    const query = `
      INSERT INTO stream_chat_messages 
        (user_id, message) 
      VALUES (?, ?)`;

    const values = [data.user_id, data.message];

    con.query(query, values, callback);
  },
  delete: (con, id) => {
    return con
      .promise()
      .query(`DELETE FROM stream_chat_messages WHERE id=${id}`)
      .then(([rows]) => rows);
  },
  deleteByStream: (con, idStream) => {
    return con
      .promise()
      .query(`DELETE FROM stream_chat_messages WHERE stream_id=${idStream}`)
      .then(([rows]) => rows);
  },
};
