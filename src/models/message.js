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
    con.query(
      `insert into message (id_chat,id_sender,id_receiver,message, img) values (${data.id_chat},${data.id_sender},${data.id_receiver},'${data.message}', '${data.img}')`,
      callback
    );
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

/*
CREATE TABLE chat (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_user_one INT NOT NULL,
    id_user_two INT NOT NULL,
    viewed_one BOOLEAN DEFAULT FALSE,
    viewed_two BOOLEAN DEFAULT FALSE,
    is_deleted_one BOOLEAN DEFAULT FALSE,
    is_deleted_two BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user_one) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (id_user_two) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    id_chat BIGINT NOT NULL,
    id_sender INT NOT NULL,
    id_receiver INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_chat) REFERENCES chat(id) ON DELETE CASCADE,
    FOREIGN KEY (id_sender) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (id_receiver) REFERENCES users(id) ON DELETE CASCADE
    );
*/
