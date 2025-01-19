const Category = require("../models/categories");
module.exports = {
  get: async (req, res) => {
    const { page, size } = req.query;

    const offset = page * size;

    const condition = `LIMIT ${size} OFFSET ${offset}`;

    const categoriesCount = await Category.getCount(req.con).then(
      (rows) => rows[0].count
    );

    console.log(categoriesCount);

    Category.get(req.con, condition, (err, result) => {
      if (err) {
        return res.status(500).send({
          response:
            "Ha ocurrido un error listando las categorias Error: " + err,
        });
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
      res.status(200).send({
        response: "Success",
      });
    });
  },
  delete: (req, res) => {
    const { id } = req.params;

    Category.delete(req.con, id, (err, result) => {
      if (err) {
        res.status(500).send({
          response: "Ha ocurrido un error eliminando la categoria" + error,
        });
      }
      res.status(200).send({
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
    console.log(query);

    query += ` where id =${id}`;
    Category.update(req.con, query, (err, result) => {
      if (err) {
        return res.status(500).send({
          response: "Ha ocurrido un error actualizando la categoria" + err,
        });
      }
      return res.status(200).send({
        response: "Success",
      });
    });
  },
};
