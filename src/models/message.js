module.exports = {
  getByIdChat: (con, id, callback) => {
    con.query(
      `SELECT * FROM message where id_chat=${id} order by id Desc limit 1`,
      callback
    );
  },
  getById: (con, id) => {
    return con
      .promise()
      .query(`SELECT * FROM message where id=${id}`)
      .then(([rows]) => rows);
  },
  getCount: (con, idChat) => {
    return con
      .promise()
      .query(`SELECT COUNT(*) as count FROM message where id_chat=${idChat}`)
      .then(([rows]) => rows);
  },

  store: (con, data, callback) => {
    const query = `
      INSERT INTO message 
        (id_chat, id_sender, id_receiver, message, img) 
      VALUES (?, ?, ?, ?, ?)`;

    const values = [
      data.id_chat,
      data.id_sender,
      data.id_receiver,
      data.message,
      data.img,
    ];

    con.query(query, values, callback);
  },
  delete: (con, id, idSender, callback) => {
    con.query(
      `DELETE FROM message WHERE id=${id} && id_sender=${idSender}`,
      callback
    );
  },
  get: (con, data, callback) => {
    con.query(
      `SELECT * FROM message WHERE id_chat=${data.id_chat} order by id desc LIMIT ${data.size} OFFSET ${data.offset};`,
      callback
    );
  },
};
