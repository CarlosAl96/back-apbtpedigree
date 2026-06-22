const PedigreeClaim = require("../models/pedigreeClaim");
const { decodeToken } = require("../utils/jwt");
const { isAdmin } = require("../utils/roles");
const { sendClaimDecisionEmail } = require("../utils/sendEmail");

const getRequestUser = (req) => {
  const { authorization } = req.headers;
  const token = authorization.replace("Bearer ", "");
  return decodeToken(token).user;
};

const sendDecisionEmailSafely = async (claim, status, adminNote) => {
  if (!claim?.requester_email) {
    return;
  }

  try {
    await sendClaimDecisionEmail({
      email: claim.requester_email,
      username: claim.requester_username,
      status,
      pedigreeId: claim.pedigree_id,
      pedigreeName: claim.pedigree_name,
      adminNote,
    });
  } catch (error) {
    console.error(
      `Could not send the ${status} claim email for claim ${claim.id}:`,
      error
    );
  }
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
    const { pedigreeId, pedigreeIds, message } = req.body;
    const requestedIds = Array.isArray(pedigreeIds)
      ? pedigreeIds
      : pedigreeId !== undefined
        ? [pedigreeId]
        : [];
    const normalizedIds = [
      ...new Set(requestedIds.map((id) => Number(id))),
    ];
    let connection;

    if (
      normalizedIds.length === 0 ||
      normalizedIds.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      return res.status(400).send({
        response: "Debes seleccionar al menos un pedigree válido",
      });
    }

    if (normalizedIds.length > 50) {
      return res.status(400).send({
        response: "Solo puedes reclamar hasta 50 pedigrees a la vez",
      });
    }

    try {
      connection = await req.con.promise().getConnection();
      await connection.beginTransaction();

      const placeholders = normalizedIds.map(() => "?").join(", ");
      const [pedigrees] = await connection.query(
        `SELECT id, name, user_id
        FROM dogsBackUp2
        WHERE id IN (${placeholders})
        FOR UPDATE`,
        normalizedIds
      );

      const foundIds = new Set(pedigrees.map((pedigree) => pedigree.id));
      const missingIds = normalizedIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        await connection.rollback();
        return res.status(404).send({
          response: `No se encontraron los pedigrees: ${missingIds.join(", ")}`,
        });
      }

      const ownedPedigrees = pedigrees.filter(
        (pedigree) => pedigree.user_id === user.id
      );

      if (ownedPedigrees.length > 0) {
        await connection.rollback();
        return res.status(400).send({
          response: `Los siguientes pedigrees ya te pertenecen: ${ownedPedigrees
            .map((pedigree) => pedigree.id)
            .join(", ")}`,
        });
      }

      const [pendingClaims] = await connection.query(
        `SELECT pedigree_id
        FROM pedigree_claims
        WHERE user_id = ?
          AND pedigree_id IN (${placeholders})
          AND status = 'pending'
        FOR UPDATE`,
        [user.id, ...normalizedIds]
      );

      if (pendingClaims.length > 0) {
        await connection.rollback();
        return res.status(409).send({
          response: `Ya tienes solicitudes pendientes para los pedigrees: ${pendingClaims
            .map((claim) => claim.pedigree_id)
            .join(", ")}`,
        });
      }

      const createdClaims = [];

      for (const pedigreeIdToClaim of normalizedIds) {
        const [result] = await connection.query(
          `INSERT INTO pedigree_claims (user_id, pedigree_id, message)
          VALUES (?, ?, ?)`,
          [user.id, pedigreeIdToClaim, message || null]
        );
        createdClaims.push({
          id: result.insertId,
          pedigreeId: pedigreeIdToClaim,
        });
      }

      await connection.commit();

      const onlyClaim = createdClaims.length === 1 ? createdClaims[0] : null;
      req.io.emit("pedigreeClaimCreated", {
        claimIds: createdClaims.map((claim) => claim.id),
        pedigreeIds: createdClaims.map((claim) => claim.pedigreeId),
        count: createdClaims.length,
        pedigreeId: onlyClaim?.pedigreeId,
        pedigreeName: onlyClaim
          ? pedigrees.find((pedigree) => pedigree.id === onlyClaim.pedigreeId)
              ?.name
          : undefined,
        requesterUsername: user.username,
      });

      return res.status(200).send({ response: { data: createdClaims } });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }

      return res.status(500).send({
        response: "Ha ocurrido un error creando la solicitud: " + error,
      });
    } finally {
      if (connection) {
        connection.release();
      }
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
          user.username AS requester_username,
          user.email AS requester_email
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

      claim.requester_email = requester.email;
      claim.pedigree_name = pedigree.name;

      const [automaticallyDeniedClaims] = await connection.query(
        `SELECT
          other_claim.*,
          other_user.username AS requester_username,
          other_user.email AS requester_email
        FROM pedigree_claims AS other_claim
        INNER JOIN users AS other_user ON other_claim.user_id = other_user.id
        WHERE other_claim.pedigree_id = ?
          AND other_claim.id != ?
          AND other_claim.status = 'pending'`,
        [claim.pedigree_id, id]
      );

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

      req.io.emit("pedigreeClaimUpdated", {
        claimId: Number(id),
        status: "approved",
      });

      await sendDecisionEmailSafely(claim, "approved", adminNote);
      await Promise.all(
        automaticallyDeniedClaims.map((deniedClaim) =>
          sendDecisionEmailSafely(
            { ...deniedClaim, pedigree_name: pedigree.name },
            "denied",
            "Another claim for this pedigree was approved."
          )
        )
      );

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

      req.io.emit("pedigreeClaimUpdated", {
        claimId: Number(id),
        status: "denied",
      });

      await sendDecisionEmailSafely(claim, "denied", adminNote);

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
