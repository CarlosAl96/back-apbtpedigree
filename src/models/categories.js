module.exports = {
  get: (con, condition, callback) => {
    con.query("SELECT * FROM forum_categories " + condition, callback);
  },
  getById: (con, id, callback) => {
    con.query(`SELECT * FROM forum_categories WHERE id=${id}`, callback);
  },
  getCount: (con) => {
    return con
      .promise()
      .query(`SELECT COUNT(*) as count FROM forum_categories`)
      .then(([rows]) => rows);
  },
  store: (con, data, callback) => {
    con.query(
      `INSERT INTO forum_categories (name,description,moderators,topics,posts,last_post) VALUES('${data.name}','${data.description}','${data.moderators}',0,0,'')`,
      callback
    );
  },
  delete: (con, id, callback) => {
    con.query("DELETE from forum_categories where id=" + id, callback);
  },
  update: (con, query, callback) => {
    con.query(query, callback);
  },
};
