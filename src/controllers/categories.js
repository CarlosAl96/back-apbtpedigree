const Category = require("../models/categories");
const postsModel = require("../models/posts");
const userModel = require("../models/user");
const topicsModel = require("../models/topics");
const { decodeToken } = require("../utils/jwt");

module.exports = {
  get: async (req, res) => {
    try {
      const { page, size } = req.query;
      const { authorization } = req.headers;

      const token = authorization.replace("Bearer ", "");
      const user = decodeToken(token).user;

      const offset = page * size;

      const condition = `ORDER BY num_order ASC LIMIT ${size} OFFSET ${offset}`;

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
    } catch (error) {
      return res.status(500).send({
        response:
          "Ha ocurrido un error listando las categorias Error: " + error,
      });
    }
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
  store: async (req, res) => {
    const last = await Category.getLast(req.con).then(
      (rows) => rows[0].num_order
    );

    console.log(last);

    req.body.num_order = last + 1;

    Category.store(req.con, req.body, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error creando la categoria" + err,
        });
      }
      req.io.emit("forum", {
        id_topic: 0,
        id_category: 0,
      });
      return res.status(200).send({
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
    const updates = req.body;

    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(updates), id];

    const query = `UPDATE forum_categories SET ${setClause} WHERE id = ?`;

    Category.update(req.con, query, values, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error actualizando la categoria: " + err,
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

  markAllAsViewed: (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      topicsModel.get(req.con, "", async (err, result) => {
        if (err) {
          return res.status(500).send({
            response: "Ha ocurrido un error listando los topics" + err,
          });
        }

        for (let i = 0; i < result.length; i++) {
          await updateViews(
            req.con,
            user.id,
            result[i].id,
            result[i].id_categories
          );
        }

        return res.status(200).send({
          response: "success",
        });
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando los topics" + error,
      });
    }
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

  orderChange: (req, res) => {
    const { id } = req.params;
    const { option } = req.body;

    try {
      Category.getById(req.con, id, async (error, result) => {
        if (error) {
          return res.status(500).send({
            response: "Ha ocurrido un error trayendo la categoria " + error,
          });
        }

        let newOrder = 0;

        if (option == "up") {
          newOrder = result[0].num_order > 0 ? result[0].num_order - 1 : 0;
        } else {
          newOrder = result[0].num_order + 1;
        }

        const adjacent = await Category.getByOrder(req.con, newOrder).then(
          (rows) => rows[0].id
        );

        await Category.setOrder(req.con, newOrder, result[0].id);
        await Category.setOrder(req.con, result[0].num_order, adjacent);

        return res.status(200).send({
          response: "Success",
        });
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error trayendo la categoria " + error,
      });
    }
  },
};

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
