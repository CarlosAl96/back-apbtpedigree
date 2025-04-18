module.exports = {
  get: (con, condition, callback) => {
    con.query(`SELECT * FROM streams ${condition}`, callback);
  },
  getActive: (con, callback) => {
    con.query(
      `SELECT * from streams where is_completed=false LIMIT 1`,
      callback
    );
  },
  getCount: (con, condition) => {
    return con
      .promise()
      .query(`SELECT COUNT(*) as count FROM streams ${condition}`)
      .then(([rows]) => rows);
  },
  setCountsPaymentsMessages: (con, payments, id) => {
    return con
      .promise()
      .query(`UPDATE streams SET user_count=${payments} WHERE id=${id}`)
      .then(([rows]) => rows);
  },
  setLive: (con, id, init, callback) => {
    con.query(
      `UPDATE streams SET is_live=true, actual_start_date='${init}' WHERE id=${id}`,
      callback
    );
  },
  setUnlive: (con, id, end, callback) => {
    con.query(
      `UPDATE streams SET is_live=false, actual_end_date='${end}' WHERE id=${id}`,
      callback
    );
  },
  setComplete: (con, id, callback) => {
    con.query(`UPDATE streams SET is_completed=true WHERE id=${id}`, callback);
  },
  reAnnounce: (con, id, callback) => {
    con.query(`UPDATE streams SET is_completed=false WHERE id=${id}`, callback);
  },
  update: (con, fields, values, callback) => {
    con.query(`UPDATE streams SET ${fields} WHERE id= ?`, values, callback);
  },

  store: (con, data, callback) => {
    const query = `
      INSERT INTO streams 
        (title, description, price, url, proposed_start_date, proposed_end_date) 
      VALUES (?, ?, ?, ?, ?, ?)`;

    const values = [
      data.title,
      data.description,
      data.price,
      data.url,
      data.proposed_start_date,
      data.proposed_end_date,
    ];

    con.query(query, values, callback);
  },
};
