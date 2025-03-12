module.exports = {
  get: (con, condition, callback) => {
    con.query(
      `SELECT payments.*, users.username as username, streams.title as title FROM payments INNER JOIN users ON users.id=payments.user_id INNER JOIN streams ON streams.id=payments.stream_id ${condition}`,
      callback
    );
  },
  getCount: (con, condition) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM payments INNER JOIN users ON users.id=payments.user_id INNER JOIN streams ON streams.id=payments.stream_id ${condition}`
      )
      .then(([rows]) => rows);
  },
  getData: (con) => {
    return con
      .promise()
      .query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count FROM payments WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month ASC;`
      )
      .then(([rows]) => rows);
  },
  getCountByStream: (con, idStream) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM payments WHERE stream_id=${idStream}`
      )
      .then(([rows]) => rows);
  },

  verify: (con, idStream, idUser) => {
    return con
      .promise()
      .query(
        `SELECT EXISTS (SELECT 1 FROM payments WHERE user_id = ${idUser} AND stream_id = ${idStream} AND payment_status = 'COMPLETED') AS has_paid;`
      )
      .then(([rows]) => rows);
  },
  store: (con, data, callback) => {
    con.query(
      `insert into payments (user_id, stream_id, amount, payment_method, transaction_id, payment_status) values (${data.user_id}, ${data.stream_id}, ${data.amount}, '${data.payment_method}', '${data.transaction_id}', 'completed')`,
      callback
    );
  },
};
