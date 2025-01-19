const topicsModel = require("../models/topics");
const Category = require("../models/categories");
const postsModel = require("../models/posts");
module.exports = {
  get: async (req, res) => {
    const { page, size, idCategories } = req.query;

    const init = (page - 1) * size;
    const offset = page * size;

    let condition = `WHERE id_categories=${idCategories}`;

    const topicsCount = await topicsModel
      .getCount(req.con, condition)
      .then((rows) => rows[0].count);

    console.log(topicsCount.count);

    condition += ` LIMIT ${size} OFFSET ${offset}`;

    topicsModel.get(req.con, condition, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error listando los topics" + err,
        });
      }
      return res.status(200).send({
        response: { data: result, totalRows: topicsCount.count },
      });
    });
  },
  store: (req, res) => {
    console.log(
      new Date().toDateString() +
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })
    );
    var object = JSON.stringify({
      date: `${new Date().toDateString()} ${new Date().toLocaleTimeString(
        "en-US",
        { hour: "numeric", minute: "numeric", hour12: true }
      )}`,
      user: req.body.id_user,
      author: req.body.author,
    });
    req.body.last_post = object;
    topicsModel.store(req.con, req.body, async (err, result) => {
      if (err) {
        res.status(500).send({
          response: "Ha ocurrido un error creando el topics" + err,
        });
      }

      var dataSavePosts = {
        message: req.body.name,
        id_user_send: req.body.id_user,
        id_posts_reply: 0,
        date: `${new Date().toDateString()} ${new Date().toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "numeric", hour12: true }
        )}`,
        id_topics: result.insertId,
      };
      var resultSavePost = await new Promise((resolve, reject) => {
        postsModel.store(req.con, dataSavePosts, (err, result) => {
          if (err) {
            return reject("Ha ocurrido un error en topics: " + err);
          }
          resolve(result[0]);
        });
      });
      var category = await new Promise((resolve, reject) => {
        Category.getById(req.con, req.body.id_categories, (err, result) => {
          if (err) {
            return reject("Ha ocurrido un error en topics: " + err);
          }
          resolve(result[0]);
        });
      });
      category.topics = category.topics + 1;
      category.posts = category.posts + 1;
      Category.update(
        req.con,
        `UPDATE categories set topics=${category.topics}, posts=${category.posts}, last_post='${object}' where id= ${req.body.id_categories}`,
        (err, result) => {
          if (err) {
            res.status(500).send({
              response: "Ha ocurrido un error creando el topics" + err,
            });
          }
          res.status(200).send({
            response: "success",
          });
        }
      );
    });
  },
  delete: (req, res) => {
    const { id } = req.params;
    topicsModel.delete(req.con, id, (err, result) => {
      if (err) {
        res.status(500).send({
          response: "Ha ocurrido un error eliminando el topics" + err,
        });
      }
      res.status(200).send({
        response: "succes",
      });
    });
  },
};
