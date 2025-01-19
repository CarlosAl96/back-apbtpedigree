module.exports = {
  get: (con, condition, callback) => {
    con.query("SELECT * FROM users " + condition, callback);
  },
  getCount: async (con, condition, callback) => {
    await con.query("SELECT COUNT(*) FROM users " + condition, callback);
  },
  getById: (con, id, callback) => {
    con.query(`SELECT * FROM users where id=${id}`, callback);
  },

  getByEmailOrUsername: (con, username, callback) => {
    con.query(
      `SELECT * FROM users where email='${username}' OR username='${username}' LIMIT 1`,
      callback
    );
  },

  getByUsername: (con, username, callback) => {
    con.query(
      `SELECT * FROM users where username='${username}' LIMIT 1`,
      callback
    );
  },

  getByEmail: (con, email, callback) => {
    con.query(`SELECT * FROM users where email='${email}' LIMIT 1`, callback);
  },

  updateLoginData: (con, userId, ip, callback) => {
    con.query(
      `UPDATE users SET stateOnline=${true}, ip='${ip}', last_login=CURRENT_TIMESTAMP WHERE id=${userId}`,
      callback
    );
  },

  updateLogoutData: (con, userId, callback) => {
    con.query(
      `UPDATE users SET stateOnline=${false} WHERE id=${userId}`,
      callback
    );
  },

  getLoggedUsers: (con) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM users WHERE subscription=0 AND stateOnline=1`
      )
      .then(([rows]) => rows);
  },

  getMembersUsers: (con) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM users WHERE subscription=1 AND stateOnline=1`
      )
      .then(([rows]) => rows);
  },

  saveUser: (con, data, callback) => {
    con.query(
      `INSERT INTO users (username, password, first_name, last_name, email, phone_number, ip, street, city, state, country, zip_code, picture, is_superuser, stateOnline, adminuser, is_staff, is_active, last_login, date_joined, payment_at)
	VALUES ('${data.username}','${data.password}','${data.first_name}','${
        data.last_name
      }','${data.email}','${data.phone_number}','${data.ip}','${
        data.street
      }','${data.city}','${data.state}','${data.country}','${data.zip_code}',${
        data.picture != "" ? "'" + data.picture + "'" : "NULL"
      }, ${false}, ${false}, ${false}, ${false}, ${false}, ${null}, CURRENT_TIMESTAMP, ${null})`,
      callback
    );
  },
};
