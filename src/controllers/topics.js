const topicsModel = require("../models/topics");
const Category = require("../models/categories");
const postsModel = require("../models/posts");
const usersModel = require("../models/user");
const { decodeToken } = require("../utils/jwt");

module.exports = {
  get: async (req, res) => {
    const { page, size, idCategories, search, previous } = req.query;

    const offset = page * size;
    let condition = `WHERE id_categories=${idCategories} AND is_deleted=false`;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (search) {
      condition += ` AND (name LIKE '%${search}%' OR author LIKE '%${search}%') `;
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

    const topicsCount = await topicsModel
      .getCount(req.con, condition)
      .then((rows) => rows[0].count);

    condition += ` ORDER BY sticky DESC, is_announcement DESC, updated_at DESC LIMIT ${size} OFFSET ${offset}`;

    topicsModel.get(req.con, condition, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error listando los topics" + err,
        });
      }

      for (let i = 0; i < result.length; i++) {
        result[i].new_posts = await getIsUnviewed(
          req.con,
          user.id,
          result[i].id,
          result[i].replies + 1
        );
      }

      return res.status(200).send({
        response: { data: result, totalRows: topicsCount },
      });
    });
  },
  store: (req, res) => {
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (!user.is_enabled || user.forum_ban) {
      return res.status(403).send({
        response: "No estás autorizado para postear en el foro",
      });
    }

    topicsModel.store(req.con, req.body, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error creando el topics" + err,
        });
      }

      const post = {
        subject: req.body.name,
        message: req.body.message,
        id_post_reply: 0,
        id_author: req.body.id_author,
        id_topic: result.insertId,
        first: true,
      };

      postsModel.store(req.con, post, async (error, row) => {
        if (err) {
          return res.status(500).send({
            response: "Ha ocurrido un error creando el post" + error,
          });
        }

        await updatePostsInfo(req.con, req.body.id_categories);
        await updateLastPost(req.con, req.body.id_categories);
        await updatePostsUsers(req.con, req.body.id_author);
        await updateViews(
          req.con,
          user.id,
          result.insertId,
          req.body.id_categories
        );

        req.io.emit("forum", {
          id_topic: result.insertId,
          id_category: req.body.id_categories,
        });

        return res.status(200).send({
          response: "succes",
        });
      });
    });
  },
  getById: (req, res) => {
    const { id } = req.params;
    const { addview } = req.query;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    topicsModel.getById(req.con, id, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }
      await topicsModel.addViews(req.con, id);

      if (addview) {
        await updateViews(req.con, user.id, id, result[0].id_categories);
      }

      return res.status(200).send({
        response: result[0],
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

    topicsModel.getById(req.con, id, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }
      const moderators = JSON.parse(result[0].moderators);
      const isModerator = moderators.some((rol) => rol.includes(user.username));

      if (result[0].id_author == user.id || user.is_superuser || isModerator) {
        topicsModel.delete(req.con, id, (err, rowDelete) => {
          if (err) {
            return res.status(500).send({
              response: "Ha ocurrido un error eliminando el topics" + err,
            });
          }

          postsModel.deletePostFromTopic(
            req.con,
            result[0].id,
            async (err, row) => {
              if (err) {
                return res.status(500).send({
                  response: "Ha ocurrido un error eliminando el topics" + err,
                });
              }

              await updatePostsInfo(req.con, result[0].id_categories);
              await updateLastPost(req.con, result[0].id_categories);
              await updatePostsUsers(req.con, result[0].id_author);
              req.io.emit("forum", {
                id_topic: result[0].id_topic,
                id_category: result[0].id_categories,
              });
              return res.status(200).send({
                response: "succes",
              });
            }
          );
        });
      } else {
        return res
          .status(403)
          .send({ response: "No tienes permiso para eliminar este topic" });
      }
    });
  },
  markAllAsViewed: (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    let condition = `WHERE id_categories=${id}`;

    topicsModel.get(req.con, condition, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error listando los topics" + err,
        });
      }

      for (let i = 0; i < result.length; i++) {
        await updateViews(req.con, user.id, result[i].id, id);
      }

      return res.status(200).send({
        response: "success",
      });
    });
  },
  sticky: (req, res) => {
    const { id } = req.params;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    topicsModel.getById(req.con, id, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }

      const moderators = JSON.parse(result[0].moderators);
      const isModerator = moderators.some((rol) => rol.includes(user.username));

      if (user.is_superuser || isModerator) {
        topicsModel.sticky(req.con, id, (err, row) => {
          if (err) {
            return res.status(500).send({
              response: "Ha ocurrido un error actualizando el topics" + err,
            });
          }
          req.io.emit("forum", {
            id_topic: result[0].id,
            id_category: result[0].id_categories,
          });
          return res.status(200).send({
            response: "succes",
          });
        });
      } else {
        return res
          .status(403)
          .send({ response: "No tienes permiso para actualizar este topic" });
      }
    });
  },

  lock: (req, res) => {
    const { id } = req.params;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    topicsModel.getById(req.con, id, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }
      const moderators = JSON.parse(result[0].moderators);
      const isModerator = moderators.some((rol) => rol.includes(user.username));

      if (result[0].id_author == user.id || user.is_superuser || isModerator) {
        topicsModel.lock(req.con, id, (err, ress) => {
          if (err) {
            return res.status(500).send({
              response: "Ha ocurrido un error actualizando el topics" + err,
            });
          }
          req.io.emit("forum", {
            id_topic: result[0].id,
            id_category: result[0].id_categories,
          });
          return res.status(200).send({
            response: "succes",
          });
        });
      } else {
        return res
          .status(403)
          .send({ response: "No tienes permiso para actualizar este topic" });
      }
    });
  },

  announcement: (req, res) => {
    const { id } = req.params;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    topicsModel.getById(req.con, id, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }
      const moderators = JSON.parse(result[0].moderators);
      const isModerator = moderators.some((rol) => rol.includes(user.username));

      if (user.is_superuser || isModerator) {
        topicsModel.announcement(req.con, id, (err, ress) => {
          if (err) {
            return res.status(500).send({
              response: "Ha ocurrido un error actualizando el topics" + err,
            });
          }
          req.io.emit("forum", {
            id_topic: result[0].id,
            id_category: result[0].id_categories,
          });
          return res.status(200).send({
            response: "succes",
          });
        });
      } else {
        return res
          .status(403)
          .send({ response: "No tienes permiso para actualizar este topic" });
      }
    });
  },

  update: (req, res) => {
    const { id } = req.params;
    const { name, message } = req.body;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    topicsModel.getById(req.con, id, (err, row) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo el topics" + err,
        });
      }

      if (row[0].id_author == user.id) {
        topicsModel.update(
          req.con,
          `update topics set name='${name}', message='${message}' WHERE id=${id}`,
          (err, result) => {
            if (err) {
              return res.status(500).send({
                response: "Ha ocurrido un error actualizando el topics" + err,
              });
            }
            req.io.emit("forum", {
              id_topic: row[0].id,
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
          .send({ response: "No tienes permiso para editar este topic" });
      }
    });
  },
};

async function updatePostsInfo(con, id_category) {
  const countPostCategory = await postsModel.getCountPostsByCategory(
    con,
    id_category
  );
  const countTopics = await topicsModel.getCount(
    con,
    `WHERE id_categories=${id_category} AND is_deleted=false`
  );

  Category.setTopics(con, id_category, countTopics[0].count, () => {});
  Category.setPosts(con, countPostCategory[0].count, id_category);
}

async function updateLastPost(con, id_category) {
  const lastPostCategory = await postsModel.getLastPostFromCategory(
    con,
    id_category
  );

  let objLastPost = {};

  if (lastPostCategory.length) {
    objLastPost = {
      date: lastPostCategory[0].created_at,
      user: lastPostCategory[0].id_author,
      author: lastPostCategory[0].username,
    };
  }

  await Category.setLastPost(
    con,
    (objLastPost = !{} ? JSON.stringify(objLastPost) : ""),
    id_category
  );
}

async function updatePostsUsers(con, id_user) {
  const countPostUsers = await postsModel.getCountPostsByUser(con, id_user);

  usersModel.setPosts(con, countPostUsers[0].count, id_user);
}

async function updateViews(con, id_user, id_topic, id_category) {
  let condition = ` WHERE id_topic=${id_topic} AND is_deleted=false`;
  const countPosts = await postsModel.getCount(con, condition);

  const viewedTopic = await topicsModel.getViewedTopic(con, id_user, id_topic);

  if (viewedTopic.length) {
    await topicsModel.updateViewedTopics(
      con,
      viewedTopic[0].id,
      countPosts[0].count
    );
  } else {
    const data = {
      id_user: id_user,
      id_topic: id_topic,
      id_category: id_category,
      posts_count: countPosts[0].count,
    };

    await topicsModel.setViewedTopics(con, data);
  }
}

async function getIsUnviewed(con, id_user, id_topic, posts) {
  const viewedTopic = await topicsModel.getViewedTopic(con, id_user, id_topic);

  if (viewedTopic.length) {
    if (posts > viewedTopic[0].posts_count) {
      return true;
    } else {
      return false;
    }
  }
  return true;
}
