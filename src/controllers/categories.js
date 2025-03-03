const Category = require("../models/categories");
const postsModel = require("../models/posts");
const userModel = require("../models/user");
const topicsModel = require("../models/topics");
const { decodeToken } = require("../utils/jwt");

module.exports = {
  get: async (req, res) => {
    const { page, size } = req.query;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    const offset = page * size;

    const condition = `LIMIT ${size} OFFSET ${offset}`;

    const categoriesCount = await Category.getCount(req.con).then(
      (rows) => rows[0].count
    );

    Category.get(req.con, condition, async (err, result) => {
      if (err) {
        return res.status(500).send({
          response:
            "Ha ocurrido un error listando las categorias Error: " + err,
        });
      }

      for (let i = 0; i < result.length; i++) {
        result[i].new_posts = await getIsUnviewed(
          req.con,
          user.id,
          result[i].id,
          result[i].posts
        );
      }
      return res.status(200).send({
        response: { data: result, totalRows: categoriesCount },
      });
    });
  },
  getById: async (req, res) => {
    const { id } = req.params;

    Category.getById(req.con, id, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error trayendo la categoria Error: " + err,
        });
      }

      return res.status(200).send({
        response: result[0],
      });
    });
  },
  store: (req, res) => {
    Category.store(req.con, req.body, (err, result) => {
      if (err) {
        res.status(500).send({
          response: "Ha ocurrido un error creando la categoria" + error,
        });
      }
      req.io.emit("forum", {
        id_topic: 0,
        id_category: 0,
      });
      res.status(200).send({
        response: "Success",
      });
    });
  },
  delete: async (req, res) => {
    const { id } = req.params;

    Category.delete(req.con, id, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error eliminando la categoria" + err,
        });
      }
      req.io.emit("forum", {
        id_topic: 0,
        id_category: id,
      });
      return res.status(200).send({
        response: "Success",
      });
    });
  },
  update: (req, res) => {
    const { id } = req.params;
    var query = "UPDATE forum_categories SET ";
    var keys = Object.keys(req.body);
    var values = Object.values(req.body);
    for (var i = 0; i < keys.length; i++) {
      query += `${keys[i]}='${values[i]}',`;
    }
    query = query.substring(0, query.length - 1);

    query += ` where id =${id}`;
    Category.update(req.con, query, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error actualizando la categoria" + err,
        });
      }
      req.io.emit("forum", {
        id_topic: 0,
        id_category: id,
      });
      return res.status(200).send({
        response: "Success",
      });
    });
  },

  lockOrUnlockCategory: (req, res) => {
    const { id } = req.params;

    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (user.is_superuser) {
      Category.lockOrUnlockCategory(req.con, id, (err, result) => {
        if (err) {
          return res.status(500).send({
            response: "Ha ocurrido un error bloqueando la categoria" + err,
          });
        }
        req.io.emit("forum", {
          id_topic: 0,
          id_category: id,
        });
        return res.status(200).send({
          response: "Success",
        });
      });
    } else {
      return res
        .status(403)
        .send({ response: "No tienes permiso para editar categorias" });
    }
  },

  getInfo: async (req, res) => {
    try {
      const postsCount = await postsModel
        .getCount(req.con, "WHERE is_deleted=false")
        .then((rows) => rows[0].count);

      const usersCount = await userModel
        .getCount(req.con, "")
        .then((rows) => rows[0].count);

      const usersLogged = await userModel
        .getCountLoggedUsers(req.con, "")
        .then((rows) => rows[0].count);

      const lastUsers = await userModel.getLastFiveUsers(req.con);

      return res.status(200).send({
        response: {
          postsCount: postsCount,
          usersCount: usersCount,
          usersLogged: usersLogged,
          lastUsers: lastUsers,
        },
      });
    } catch (error) {
      res.status(500).send({
        response: "Ha ocurrido un error trayendo la informacion" + error,
      });
    }
  },

  haveNewPosts: (req, res) => {
    const { id } = req.params;

    let condition = `WHERE id_categories=${id}`;

    topicsModel.get(req.con, condition, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error listando los topics" + err,
        });
      }

      for (let i = 0; i < result.length; i++) {}
    });
  },
};

async function getIsUnviewed(con, id_user, id_category, posts) {
  const viewedTopics = await topicsModel.getViewedTopics(
    con,
    id_user,
    id_category
  );

  if (viewedTopics.length) {
    let postsViewed = 0;

    for (let i = 0; i < viewedTopics.length; i++) {
      postsViewed += viewedTopics[i].posts_count;
    }

    if (posts > postsViewed) {
      return true;
    } else {
      return false;
    }
  }
  return true;
}
