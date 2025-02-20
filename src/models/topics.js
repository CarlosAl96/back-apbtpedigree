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
    con.query(
      `select topics.*, forum_categories.moderators as moderators, forum_categories.name as category_name from topics INNER JOIN forum_categories ON topics.id_categories=forum_categories.id where topics.id=${id}`,
      callback
    );
  },
  store: (con, data, callback) => {
    con.query(
      `INSERT INTO topics (name, message, author, id_author, id_categories) VALUES('${data.name}', '${data.message}', '${data.author}', ${data.id_author}, ${data.id_categories})`,
      callback
    );
  },
  delete: (con, id, callback) => {
    con.query("UPDATE topics SET is_deleted=true where id=" + id, callback);
  },
  sticky: (con, id, callback) => {
    con.query("UPDATE topics SET sticky = !sticky where id=" + id, callback);
  },
  lock: (con, id, callback) => {
    con.query(
      "UPDATE topics SET is_locked = !is_locked where id=" + id,
      callback
    );
  },
  announcement: (con, id, callback) => {
    con.query(
      "UPDATE topics SET is_announcement = !is_announcement where id=" + id,
      callback
    );
  },
  update: (con, query, callback) => {
    con.query(query, callback);
  },
  setLastPost: (con, last_post, id) => {
    return con
      .promise()
      .query(`UPDATE topics SET last_post = '${last_post}' WHERE id=${id}`)
      .then(([rows]) => rows);
  },
  setReplies: (con, replies, id) => {
    return con
      .promise()
      .query(`UPDATE topics SET replies = ${replies} WHERE id=${id}`)
      .then(([rows]) => rows);
  },
  addViews: (con, id) => {
    return con
      .promise()
      .query(`UPDATE topics SET views = views + 1 WHERE id=${id}`)
      .then(([rows]) => rows);
  },

  getPostsReviews: (con, query, callback) => {
    con.query(query, callback);
  },
  setViewedTopics: (con, data) => {
    return con
      .promise()
      .query(
        `INSERT INTO viewed_topics (id_topic, id_user, id_category, posts_count) values (${data.id_topic}, ${data.id_user}, ${data.id_category}, ${data.posts_count})`
      )
      .then(([rows]) => rows);
  },
  getViewedTopic: (con, id_user, id_topic) => {
    return con
      .promise()
      .query(
        `SELECT * FROM viewed_topics WHERE id_user=${id_user} AND id_topic=${id_topic} LIMIT 1`
      )
      .then(([rows]) => rows);
  },
  getViewedTopics: (con, id_user, id_category) => {
    return con
      .promise()
      .query(
        `SELECT * FROM viewed_topics WHERE id_user=${id_user} AND id_category=${id_category}`
      )
      .then(([rows]) => rows);
  },
};
