const Pedigree = require("../models/pedigree");
const User = require("../models/user");
const { removeFile } = require("../utils/dir");
const { decodeToken } = require("../utils/jwt");

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
      condition = ` WHERE pedigree.name LIKE ?`;
      params.push(`%${registeredName}%`);
    }
    if (dogId) {
      condition = ` WHERE pedigree.id = ?`;
      params.push(dogId);
    }
    if (registrationNumber) {
      condition = ` WHERE pedigree.registrationNumber LIKE ?`;
      params.push(`%${registrationNumber}%`);
    }
    if (callname) {
      condition = ` WHERE pedigree.callname LIKE ?`;
      params.push(`%${callname}%`);
    }
    if (breeder) {
      condition = ` WHERE pedigree.breeder LIKE ?`;
      params.push(`%${breeder}%`);
    }
    if (owner) {
      condition = ` WHERE pedigree.owner LIKE ?`;
      params.push(`%${owner}%`);
    }
    if (userId) {
      condition = ` WHERE pedigree.user_id = ?`;
      params.push(userId);
    }

    const offset = page * size;

    try {
      const pedigreesCount = await Pedigree.getCount(
        req.con,
        params,
        condition
      ).then((rows) => rows[0].count);

      condition += ` ORDER BY pedigree.${orderBy} LIMIT ${size} OFFSET ${offset}`;

      Pedigree.get(req.con, params, condition, (error, rows) => {
        if (error) {
          return res.status(500).send({
            response: "Ha ocurrido un error listando los pedigrees: " + error,
          });
        } else {
          return res
            .status(200)
            .send({ response: { data: rows, totalRows: pedigreesCount } });
        }
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando los pedigrees: " + error,
      });
    }
  },
  getById: async (req, res) => {
    const { id } = req.params;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      Pedigree.updateViewsCount(req.con, id, (error, rows) => {});

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

      return res.status(200).send({
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
      return res.status(500).send({
        response:
          "Ha ocurrido un error trayendo el pedigree con id: " +
          id +
          " error: " +
          error,
      });
    }
  },

  store: async (req, res) => {
    req.body.img = "";

    if (req.file) {
      req.body.img = req.file.filename;
    }

    console.log(req.body);

    Pedigree.savePedigree(req.con, req.body, (error, rows) => {
      if (error) {
        if (req.body.img) {
          removeFile(`pedigrees/${req.body.img}`);
        }
        res.status(500).send({
          response:
            "Ha ocurrido un error guardando el pedigree, error: " + error,
        });
      } else {
        res.status(200).send({ response: rows });
      }
    });
  },

  update: (req, res) => {
    const { id } = req.params;

    if (req.file) {
      req.body.img = req.file.filename;
      if (req.body.old_img) {
        removeFile(`pedigrees/${req.body.old_img}`);
      }
    }

    Pedigree.updatePedigree(req.con, req.body, id, (error, rows) => {
      if (error) {
        console.log(error);

        res.status(500).send({
          response:
            "Ha ocurrido un error actualizando el pedigree, error: " + error,
        });
      } else {
        res.status(200).send({ response: rows });
      }
    });
  },

  delete: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== user.id && !user.is_superuser) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      Pedigree.delete(req.con, id, (error, row) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al eliminar el Pedigree" });
        } else {
          return res.status(200).send({ response: row });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },

  changeOwner: async (req, res) => {
    const { id } = req.params;
    const { newOwner, description } = req.body;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const userData = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== userData.id && !userData.is_superuser) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      const user = await new Promise((resolve, reject) => {
        User.getById(req.con, newOwner, (error, row) => {
          if (error) return reject(error);
          resolve(row);
        });
      });

      if (!user.length) {
        return res.status(404).send({ response: "El usuario no existe" });
      }

      const updated = Pedigree.changeOwnership(
        req.con,
        id,
        user[0].id,
        user[0].username,
        description
      );

      if (updated) {
        return res
          .status(200)
          .send({ response: "Pedigree actualizado correctamente" });
      }
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },

  changePermissions: async (req, res) => {
    const { id } = req.params;
    const { private } = req.body;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== user.id && !user.is_superuser) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      pedigree.private = private;

      Pedigree.changePermissions(req.con, private, id, (error, row) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al actualizar el Pedigree" });
        } else {
          return res
            .status(200)
            .send({ response: "Pedigree actualizado correctamente", pedigree });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },

  updateImg: (req, res) => {
    const { id } = req.params;

    req.body.img = "";

    if (req.body.old_img) {
      removeFile(`pedigrees/${req.body.old_img}`);
    }

    if (req.file) {
      req.body.img = req.file.filename;
    }

    Pedigree.updateImg(req.con, req.body.img, id, (error, rows) => {
      if (error) {
        res.status(500).send({
          response:
            "Ha ocurrido un error actualizando el pedigree, error: " + error,
        });
      } else {
        res.status(200).send({ response: rows });
      }
    });
  },
  getLogs: (req, res) => {
    const { id } = req.params;
    Pedigree.getLogs(req.con, id, (error, rows) => {
      if (error) {
        res.status(500).send({
          response:
            "Ha ocurrido un error listando los logs del pedigree, error: " +
            error,
        });
      } else {
        res.status(200).send({ response: rows });
      }
    });
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
