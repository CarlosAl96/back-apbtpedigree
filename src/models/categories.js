module.exports = {
  get: (con, condition, callback) => {
    con.query("SELECT * FROM forum_categories " + condition, callback);
  },
  getById: (con, id, callback) => {
    con.query(`SELECT * FROM forum_categories WHERE id=${id}`, callback);
  },
  getByOrder: (con, order) => {
    return con
      .promise()
      .query(`SELECT * FROM forum_categories WHERE num_order=${order} LIMIT 1`)
      .then(([rows]) => rows);
  },
  getLast: (con) => {
    return con
      .promise()
      .query(`SELECT * FROM forum_categories ORDER BY num_order DESC LIMIT 1`)
      .then(([rows]) => rows);
  },
  setOrder: (con, order, id) => {
    return con
      .promise()
      .query(
        `UPDATE forum_categories SET num_order=${order} WHERE id=${id} LIMIT 1`
      )
      .then(([rows]) => rows);
  },
  getCount: (con) => {
    return con
      .promise()
      .query(`SELECT COUNT(*) as count FROM forum_categories`)
      .then(([rows]) => rows);
  },

  store: (con, data, callback) => {
    const query = `
      INSERT INTO forum_categories 
        (name, description, moderators, topics, posts, last_post, num_order) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      data.name,
      data.description,
      data.moderators,
      0,
      0,
      "",
      data.num_order,
    ];

    con.query(query, values, callback);
  },
  delete: (con, id, callback) => {
    con.query("DELETE from forum_categories where id=" + id, callback);
  },
  update: (con, query, values, callback) => {
    con.query(query, values, callback);
  },
  setTopics: (con, id, topics, callback) => {
    con.query(
      `UPDATE forum_categories SET topics = ${topics} WHERE id=${id}`,
      callback
    );
  },
  setLastPost: (con, last_post, id) => {
    return con
      .promise()
      .query(
        `UPDATE forum_categories SET last_post = '${last_post}' WHERE id=${id}`
      )
      .then(([rows]) => rows);
  },
  setPosts: (con, posts, id) => {
    return con
      .promise()
      .query(`UPDATE forum_categories SET posts = ${posts} WHERE id=${id}`)
      .then(([rows]) => rows);
  },

  lockOrUnlockCategory: (con, id, callback) => {
    con.query(
      `UPDATE forum_categories SET is_locked = !is_locked WHERE id=${id}`,
      callback
    );
  },
};
