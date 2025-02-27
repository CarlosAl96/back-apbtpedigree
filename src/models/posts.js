module.exports = {
  get: (con, condition, callback) => {
    con.query(
      "SELECT posts.*, users.posts as posts, users.username as username, users.date_joined as date_joined, users.city as city, users.state as state, users.country as country, users.picture as picture, users.email as email, users.show_email as show_email, users.show_phone as show_phone, users.show_location as show_location FROM posts INNER JOIN users ON posts.id_author = users.id " +
        condition,
      callback
    );
  },
  getById: (con, id, callback) => {
    con.query(
      `select posts.*, forum_categories.id as id_categories, forum_categories.moderators as moderators from posts INNER JOIN topics ON posts.id_topic = topics.id INNER JOIN forum_categories ON topics.id_categories=forum_categories.id where posts.id=${id}`,
      callback
    );
  },
  getCount: (con, condition) => {
    return con
      .promise()
      .query(`SELECT COUNT(*) as count FROM posts ${condition}`)
      .then(([rows]) => rows);
  },
  getCountPostsByCategory: (con, id_category) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM posts INNER JOIN topics ON posts.id_topic = topics.id WHERE topics.id_categories = ${id_category} AND posts.is_deleted=false`
      )
      .then(([rows]) => rows);
  },
  getCountPostsByUser: (con, id_user) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM posts WHERE id_author = ${id_user} AND is_deleted = false`
      )
      .then(([rows]) => rows);
  },
  getLastPostFromTopic: (con, id_topic) => {
    return con
      .promise()
      .query(
        `SELECT posts.*, users.username as username FROM posts INNER JOIN users ON posts.id_author = users.id WHERE id_topic = ${id_topic} AND posts.is_deleted=false ORDER BY posts.created_at DESC LIMIT 1`
      )
      .then(([rows]) => rows);
  },
  getLastPostFromCategory: (con, id_category) => {
    return con
      .promise()
      .query(
        `SELECT posts.*, users.username as username FROM posts INNER JOIN topics ON posts.id_topic = topics.id INNER JOIN users ON posts.id_author = users.id WHERE topics.id_categories = ${id_category} AND posts.is_deleted=false`
      )
      .then(([rows]) => rows);
  },
  store: (con, data, callback) => {
    con.query(
      `INSERT INTO posts (subject, message, id_post_reply, id_author, id_topic, first) VALUES('${data.subject}', '${data.message}', ${data.id_post_reply}, ${data.id_author}, ${data.id_topic}, ${data.first})`,
      callback
    );
  },
  delete: (con, id, callback) => {
    con.query("UPDATE posts SET is_deleted=true where id=" + id, callback);
  },
  deletePostFromTopic: (con, idTopic, callback) => {
    con.query(
      "UPDATE posts SET is_deleted=true WHERE id_topic=" + idTopic,
      callback
    );
  },
  update: (con, query, callback) => {
    con.query(query, callback);
  },
};
