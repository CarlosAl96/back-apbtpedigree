module.exports = {
  get: (con, condition, callback) => {
    con.query("SELECT * FROM topics " + condition, callback);
  },
  getCount: (con, condition) => {
    return con
      .promise()
      .query(`SELECT COUNT(*) as count FROM topics ${condition}`)
      .then(([rows]) => rows);
  },
  getById: (con, id, callback) => {
    con.query(`select * from topics where id=${id}`, callback);
  },
  store: (con, data, callback) => {
    con.query(
      `INSERT INTO topics (name,replies,author,views,last_post,id_categories,sticky) VALUES('${data.name}',0,'${data.author}',0,'${data.last_post}',${data.id_categories},${data.sticky})`,
      callback
    );
  },
  delete: (con, id, callback) => {
    con.query("DELETE from topics where id=" + id, callback);
  },
  update: (con, query, callback) => {
    con.query(query, callback);
  },
};
