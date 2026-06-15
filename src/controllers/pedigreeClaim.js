const Pedigree = require("../models/pedigree");
const PedigreeClaim = require("../models/pedigreeClaim");
const { decodeToken } = require("../utils/jwt");
const { isAdmin } = require("../utils/roles");

const getRequestUser = (req) => {
  const { authorization } = req.headers;
  const token = authorization.replace("Bearer ", "");
  return decodeToken(token).user;
};

const getPedigree = (con, pedigreeId) => {
  return Pedigree.getById(con, pedigreeId).then((rows) => rows[0]);
};

module.exports = {
  index: async (req, res) => {
    const user = getRequestUser(req);

    try {
      const claims = await PedigreeClaim.getByUser(req.con, user.id);

      return res.status(200).send({ response: claims });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando las solicitudes: " + error,
      });
    }
  },

  adminIndex: async (req, res) => {
    const user = getRequestUser(req);

    if (!isAdmin(user)) {
      return res.status(403).send({ response: "No tienes permiso" });
    }

    try {
      const claims = await PedigreeClaim.getAll(req.con);

      return res.status(200).send({ response: claims });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando las solicitudes: " + error,
      });
    }
  },

  store: async (req, res) => {
    const user = getRequestUser(req);
    const { pedigreeId, message } = req.body;

    if (!pedigreeId || Number.isNaN(Number(pedigreeId))) {
      return res.status(400).send({ response: "El id del pedigree es requerido" });
    }

    try {
      const pedigree = await getPedigree(req.con, Number(pedigreeId));

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id === user.id) {
        return res
          .status(400)
          .send({ response: "Este Pedigree ya pertenece al usuario" });
      }

      const pendingClaim = await PedigreeClaim.getPendingByUserAndPedigree(
        req.con,
        user.id,
        Number(pedigreeId)
      ).then((rows) => rows[0]);

      if (pendingClaim) {
        return res.status(409).send({
          response: "Ya existe una solicitud pendiente para este Pedigree",
        });
      }

      const claim = await PedigreeClaim.create(
        req.con,
        user.id,
        Number(pedigreeId),
        message
      );

      return res.status(200).send({ response: claim });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error creando la solicitud: " + error,
      });
    }
  },

  approve: async (req, res) => {
    const admin = getRequestUser(req);
    const { id } = req.params;
    const { adminNote } = req.body;
    let connection;

    if (!isAdmin(admin)) {
      return res.status(403).send({ response: "No tienes permiso" });
    }

    try {
      connection = await req.con.promise().getConnection();
      await connection.beginTransaction();

      const [claims] = await connection.query(
        `SELECT 
          claim.*,
          user.username AS requester_username
        FROM pedigree_claims AS claim
        INNER JOIN users AS user ON claim.user_id = user.id
        WHERE claim.id = ?
        LIMIT 1
        FOR UPDATE`,
        [id]
      );
      const claim = claims[0];

      if (!claim) {
        await connection.rollback();
        return res.status(404).send({ response: "Solicitud no encontrada" });
      }

      if (claim.status !== "pending") {
        await connection.rollback();
        return res
          .status(400)
          .send({ response: "La solicitud ya fue revisada" });
      }

      const [pedigrees] = await connection.query(
        `SELECT * FROM dogsBackUp2 WHERE id = ? LIMIT 1 FOR UPDATE`,
        [claim.pedigree_id]
      );
      const pedigree = pedigrees[0];

      if (!pedigree) {
        await connection.rollback();
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      const [requesters] = await connection.query(
        `SELECT * FROM users WHERE id = ? LIMIT 1`,
        [claim.user_id]
      );
      const requester = requesters[0];

      if (!requester) {
        await connection.rollback();
        return res.status(404).send({ response: "Usuario solicitante no encontrado" });
      }

      await connection.query(
        `UPDATE dogsBackUp2 
        SET user_id = ?, entered_by = ?, owner = ?
        WHERE id = ?`,
        [requester.id, requester.id, requester.username, claim.pedigree_id]
      );
      await connection.query(
        `UPDATE pedigree_claims 
        SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, admin_note = ?
        WHERE id = ?`,
        [admin.id, adminNote || null, id]
      );
      await connection.query(
        `UPDATE pedigree_claims 
        SET status = 'denied', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
            admin_note = COALESCE(admin_note, 'Denied automatically after another claim was approved')
        WHERE pedigree_id = ? AND id != ? AND status = 'pending'`,
        [admin.id, claim.pedigree_id, id]
      );
      await connection.commit();

      return res
        .status(200)
        .send({ response: "Solicitud aprobada correctamente" });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      return res.status(500).send({
        response: "Ha ocurrido un error aprobando la solicitud: " + error,
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  deny: async (req, res) => {
    const admin = getRequestUser(req);
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!isAdmin(admin)) {
      return res.status(403).send({ response: "No tienes permiso" });
    }

    try {
      const claim = await PedigreeClaim.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!claim) {
        return res.status(404).send({ response: "Solicitud no encontrada" });
      }

      if (claim.status !== "pending") {
        return res
          .status(400)
          .send({ response: "La solicitud ya fue revisada" });
      }

      await PedigreeClaim.updateStatus(
        req.con,
        id,
        "denied",
        admin.id,
        adminNote
      );

      return res
        .status(200)
        .send({ response: "Solicitud denegada correctamente" });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error denegando la solicitud: " + error,
      });
    }
  },

  delete: async (req, res) => {
    const admin = getRequestUser(req);
    const { id } = req.params;

    if (!isAdmin(admin)) {
      return res.status(403).send({ response: "No tienes permiso" });
    }

    try {
      await PedigreeClaim.delete(req.con, id);
      return res.status(200).send({ response: "Solicitud eliminada correctamente" });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error eliminando la solicitud: " + error,
      });
    }
  },
};
