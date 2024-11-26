const Pedigree = require("../models/pedigree");
const User = require("../models/user");

module.exports = {
  index: async (req, res) => {
    const {
      page,
      size,
      orderBy,
      registeredName,
      dogId,
      registrationNumber,
      callname,
      breeder,
      owner,
      userId,
    } = req.query;

    let condition = "";
    const params = [];

    if (registeredName) {
      condition = ` WHERE name LIKE ?`;
      params.push(`%${registeredName}%`);
    }
    if (dogId) {
      condition = ` WHERE id = ?`;
      params.push(dogId);
    }
    if (registrationNumber) {
      condition = ` WHERE registrationNumber LIKE ?`;
      params.push(`%${registrationNumber}%`);
    }
    if (callname) {
      condition = ` WHERE callname LIKE ?`;
      params.push(`%${callname}%`);
    }
    if (breeder) {
      condition = ` WHERE breeder LIKE ?`;
      params.push(`%${breeder}%`);
    }
    if (owner) {
      condition = ` WHERE owner LIKE ?`;
      params.push(`%${owner}%`);
    }
    if (userId) {
      condition = ` WHERE user_id = ?`;
      params.push(userId);
    }

    const offset = page * size;

    try {
      const pedigreesCount = await Pedigree.getCount(
        req.con,
        params,
        condition
      ).then((rows) => rows[0].count);

      condition += ` ORDER BY ${orderBy} LIMIT ${size} OFFSET ${offset}`;
      console.log(condition);
      Pedigree.get(req.con, params, condition, (error, rows) => {
        if (error) {
          res.status(500).send({
            response: "Ha ocurrido un error listando los pedigrees: " + error,
          });
        } else {
          res
            .status(200)
            .send({ response: { data: rows, totalRows: pedigreesCount } });
        }
      });
    } catch (error) {
      console.error("Ha ocurrido un error listando los pedigrees: ", error);
      throw error;
    }
  },
  getById: async (req, res) => {
    const { id } = req.params;
    console.log(id);

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      let generation1 = [];
      let generation2 = [];
      let generation3 = [];
      let generation4 = [];

      generation1 = await getParents(
        req.con,
        pedigree.father_id,
        pedigree.mother_id
      );

      for (let i = 0; i < generation1.length; i++) {
        if (generation1[i] != undefined) {
          const parents = await getParents(
            req.con,
            generation1[i].father_id,
            generation1[i].mother_id
          );
          generation2 = generation2.concat(parents);
        } else {
          generation2 = generation2.concat([undefined, undefined]);
        }
      }

      for (let i = 0; i < generation2.length; i++) {
        if (generation2[i] != undefined) {
          const parents = await getParents(
            req.con,
            generation2[i].father_id,
            generation2[i].mother_id
          );
          generation3 = generation3.concat(parents);
        } else {
          generation3 = generation3.concat([undefined, undefined]);
        }
      }

      for (let i = 0; i < generation3.length; i++) {
        if (generation3[i] != undefined) {
          const parents = await getParents(
            req.con,
            generation3[i].father_id,
            generation3[i].mother_id
          );
          generation4 = generation4.concat(parents);
        } else {
          generation4 = generation4.concat([undefined, undefined]);
        }
      }

      const siblings = await Pedigree.getBrothers(
        req.con,
        pedigree.id,
        pedigree.father_id,
        pedigree.mother_id
      );

      const offsprings = await Pedigree.getChildren(req.con, pedigree.id);

      res.status(200).send({
        response: {
          pedigree,
          siblings,
          offsprings,
          generation1,
          generation2,
          generation3,
          generation4,
        },
      });
    } catch (error) {
      res.status(500).send({
        response:
          "Ha ocurrido un error trayendo el pedigree con id: " +
          id +
          " error: " +
          error,
      });
    }
  },

  getLogs: async (req, res) => {},

  store: async (req, res) => {
    try {
      const userByUsername = await new Promise((resolve, reject) => {
        User.getByUsername(req.con, req.body.username, (error, row) => {
          if (error) return reject(error);
          resolve(row);
        });
      });

      if (userByUsername.length > 0) {
        return res.status(400).send({
          response: {
            msg: "Ya está registrado este nombre de usuario",
            error: "username",
          },
        });
      }

      const userByEmail = await new Promise((resolve, reject) => {
        User.getByEmail(req.con, req.body.email, (error, row) => {
          if (error) return reject(error);
          resolve(row);
        });
      });

      if (userByEmail.length > 0) {
        return res.status(400).send({
          response: { msg: "Ya está registrado este correo", error: "email" },
        });
      }

      const genSalt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, genSalt);
      req.body.ip = req.ip || req.ips;

      console.log(req.body);

      const savedUser = await new Promise((resolve, reject) => {
        User.saveUser(req.con, req.body, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
      });

      res.status(200).send({ response: savedUser });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        response:
          "Ha ocurrido un error registrando al usuario: " + error.message,
      });
    }
  },

  update: (req, res) => {},

  delete: async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== userId) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      Pedigree.delete(req.con, id, (error, row) => {
        if (error) {
          res.status(500).send({ response: "Error al eliminar el Pedigree" });
        } else {
          res.status(200).send({ response: row });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({ response: "Error al actualizar el Pedigree" });
    }
  },

  changeOwner: async (req, res) => {
    const { id } = req.params;
    const { idNewOwner, owner, userId } = req.body;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== userId) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      pedigree.user_id = idNewOwner;

      Pedigree.changeOwner(req.con, idNewOwner, owner, (error, row) => {
        if (error) {
          res.status(500).send({ response: "Error al actualizar el Pedigree" });
        } else {
          res
            .status(200)
            .send({ response: "Pedigree actualizado correctamente", pedigree });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({ response: "Error al actualizar el Pedigree" });
    }
  },

  changePermissions: async (req, res) => {
    const { id } = req.params;
    const { editable, userId } = req.body;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== userId) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      pedigree.editable = editable;

      Pedigree.changePermissions(req.con, editable, id, (error, row) => {
        if (error) {
          res.status(500).send({ response: "Error al actualizar el Pedigree" });
        } else {
          res
            .status(200)
            .send({ response: "Pedigree actualizado correctamente", pedigree });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({ response: "Error al actualizar el Pedigree" });
    }
  },
};

const getParents = async (con, idFather, idMother) => {
  const father = await Pedigree.getFather(con, idFather).then(
    (rows) => rows[0]
  );
  const mother = await Pedigree.getMother(con, idMother).then(
    (rows) => rows[0]
  );

  return [father, mother];
};
