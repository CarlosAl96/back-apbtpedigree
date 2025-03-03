const postsModel = require("../models/posts");
const topicsModel = require("../models/topics");
const Category = require("../models/categories");
const usersModel = require("../models/user");
const { decodeToken } = require("../utils/jwt");

module.exports = {
  get: async (req, res) => {
    const { page, size, idTopic, search, previous, order } = req.query;

    const offset = page * size;
    let condition = `WHERE id_topic=${idTopic} AND is_deleted=false`;

    if (search) {
      condition += ` AND (subject LIKE '%${search}%' OR message LIKE '%${search}%') `;
    }

    if (previous) {
      let days = 0;

      switch (previous) {
        case "1_days":
          days = 1;
          break;
        case "2_days":
          days = 2;
          break;
        case "3_days":
          days = 3;
          break;
        case "4_days":
          days = 4;
          break;
        case "5_days":
          days = 5;
          break;
        case "6_days":
          days = 6;
          break;
        case "7_days":
          days = 7;
          break;
        case "1_year":
          days = 365;
          break;
      }

      if (days > 0) {
        condition += ` AND created_at >= NOW() - INTERVAL ${days} DAY`;
      }
    }

    const postsCount = await postsModel
      .getCount(req.con, condition)
      .then((rows) => rows[0].count);

    condition += ` ORDER BY first DESC, created_at ${order} LIMIT ${size} OFFSET ${offset}`;

    postsModel.get(req.con, condition, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error listando los topics" + err,
        });
      }
      return res.status(200).send({
        response: { data: result, totalRows: postsCount },
      });
    });
  },
  getById: (req, res) => {
    const { id } = req.params;
    postsModel.getById(req.con, id, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el post" + err,
        });
      }

      return res.status(200).send({
        response: result[0],
      });
    });
  },
  store: (req, res) => {
    req.body.first = false;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!user.is_enabled || user.forum_ban) {
      return res.status(403).send({
        response: "No estás autorizado para postear en el foro",
      });
    }

    postsModel.store(req.con, req.body, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error creando el posts " + err,
        });
      }

      await updateRepliesInfo(
        req.con,
        req.body.id_topic,
        req.body.id_categories
      );
      await updateLastPost(req.con, req.body.id_topic, req.body.id_categories);
      await updatePostsUsers(req.con, req.body.id_author);
      req.io.emit("forum", {
        id_topic: req.body.id_topic,
        id_category: req.body.id_categories,
      });
      return res.status(200).send({
        response: result,
      });
    });
  },

  delete: (req, res) => {
    const { id } = req.params;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!user.is_enabled || user.forum_ban) {
      return res.status(403).send({
        response: "No estás autorizado para postear en el foro",
      });
    }

    postsModel.getById(req.con, id, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }
      const moderators = JSON.parse(result[0].moderators);
      const isModerator = moderators.some((rol) => rol.includes(user.username));

      if (result[0].id_author == user.id || user.is_superuser || isModerator) {
        postsModel.delete(req.con, id, async (err, rowDelete) => {
          if (err) {
            return res.status(500).send({
              response: "Ha ocurrido un error eliminando el post" + err,
            });
          }

          await updateRepliesInfo(
            req.con,
            result[0].id_topic,
            result[0].id_categories
          );
          await updateLastPost(
            req.con,
            result[0].id_topic,
            result[0].id_categories
          );
          await updatePostsUsers(req.con, result[0].id_author);

          req.io.emit("forum", {
            id_topic: result[0].id_topic,
            id_category: result[0].id_categories,
          });
          return res.status(200).send({
            response: "succes",
          });
        });
      } else {
        return res
          .status(403)
          .send({ response: "No tienes permiso para eliminar este topic" });
      }
    });
  },
  update: (req, res) => {
    const { id } = req.params;
    const { subject, message } = req.body;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    postsModel.getById(req.con, id, (err, row) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }

      if (row[0].id_author == user.id) {
        postsModel.update(
          req.con,
          `update posts set subject='${subject}', message='${message}' WHERE id=${id}`,
          (err, result) => {
            if (err) {
              return res.status(500).send({
                response: "Ha ocurrido un error actualizando el post" + err,
              });
            }
            req.io.emit("forum", {
              id_topic: row[0].id_topic,
              id_category: row[0].id_categories,
            });
            return res.status(200).send({
              response: result,
            });
          }
        );
      } else {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este post" });
      }
    });
  },
};

async function updateRepliesInfo(con, id_topic, id_category) {
  let condition = ` WHERE id_topic=${id_topic} AND is_deleted=false AND first=false`;
  const countPosts = await postsModel.getCount(con, condition);

  topicsModel.setReplies(con, countPosts[0].count, id_topic);

  const countPostCategory = await postsModel.getCountPostsByCategory(
    con,
    id_category
  );

  Category.setPosts(con, countPostCategory[0].count, id_category);
}

async function updateLastPost(con, id_topic, id_category) {
  const lastPostCategory = await postsModel.getLastPostFromCategory(
    con,
    id_category
  );

  const lastPostTopic = await postsModel.getLastPostFromTopic(con, id_topic);

  if (lastPostCategory) {
    const objLastPost = {
      date: lastPostCategory[0].created_at,
      user: lastPostCategory[0].id_author,
      topic: id_topic,
      author: lastPostCategory[0].username,
    };

    await Category.setLastPost(con, JSON.stringify(objLastPost), id_category);
  }

  if (lastPostTopic) {
    const objLastPost = {
      date: lastPostTopic[0].created_at,
      user: lastPostTopic[0].id_author,
      topic: id_topic,
      author: lastPostTopic[0].username,
    };

    await topicsModel.setLastPost(con, JSON.stringify(objLastPost), id_topic);
  }
}

async function updatePostsUsers(con, id_user) {
  const countPostUsers = await postsModel.getCountPostsByUser(con, id_user);

  usersModel.setPosts(con, countPostUsers[0].count, id_user);
}
