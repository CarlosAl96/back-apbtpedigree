module.exports = {
  getAll: (con) => {
    return con
      .promise()
      .query(
        `SELECT 
          claim.*,
          pedigree.name AS pedigree_name,
          pedigree.beforeNameTitles AS pedigree_beforeNameTitles,
          pedigree.afterNameTitles AS pedigree_afterNameTitles,
          pedigree.owner AS current_owner,
          pedigree.user_id AS current_owner_id,
          user.username AS requester_username,
          user.first_name AS requester_first_name,
          user.last_name AS requester_last_name,
          reviewer.username AS reviewer_username
        FROM pedigree_claims AS claim
        INNER JOIN dogsBackUp2 AS pedigree ON claim.pedigree_id = pedigree.id
        INNER JOIN users AS user ON claim.user_id = user.id
        LEFT JOIN users AS reviewer ON claim.reviewed_by = reviewer.id
        ORDER BY claim.created_at DESC, claim.id DESC`
      )
      .then(([rows]) => rows);
  },

  getByUser: (con, userId) => {
    return con
      .promise()
      .query(
        `SELECT 
          claim.*,
          pedigree.name AS pedigree_name,
          pedigree.beforeNameTitles AS pedigree_beforeNameTitles,
          pedigree.afterNameTitles AS pedigree_afterNameTitles,
          pedigree.owner AS current_owner,
          pedigree.user_id AS current_owner_id,
          reviewer.username AS reviewer_username
        FROM pedigree_claims AS claim
        INNER JOIN dogsBackUp2 AS pedigree ON claim.pedigree_id = pedigree.id
        LEFT JOIN users AS reviewer ON claim.reviewed_by = reviewer.id
        WHERE claim.user_id = ?
        ORDER BY claim.created_at DESC, claim.id DESC`,
        [userId]
      )
      .then(([rows]) => rows);
  },

  getById: (con, id) => {
    return con
      .promise()
      .query(
        `SELECT 
          claim.*,
          user.username AS requester_username,
          user.email AS requester_email,
          pedigree.name AS pedigree_name
        FROM pedigree_claims AS claim
        INNER JOIN users AS user ON claim.user_id = user.id
        INNER JOIN dogsBackUp2 AS pedigree ON claim.pedigree_id = pedigree.id
        WHERE claim.id = ?
        LIMIT 1`,
        [id]
      )
      .then(([rows]) => rows);
  },

  getPendingByUserAndPedigree: (con, userId, pedigreeId) => {
    return con
      .promise()
      .query(
        `SELECT * 
        FROM pedigree_claims 
        WHERE user_id = ? AND pedigree_id = ? AND status = 'pending'
        LIMIT 1`,
        [userId, pedigreeId]
      )
      .then(([rows]) => rows);
  },

  create: (con, userId, pedigreeId, message) => {
    return con
      .promise()
      .query(
        `INSERT INTO pedigree_claims (user_id, pedigree_id, message)
        VALUES (?, ?, ?)`,
        [userId, pedigreeId, message || null]
      )
      .then(([rows]) => rows);
  },

  updateStatus: (con, id, status, reviewedBy, adminNote) => {
    return con
      .promise()
      .query(
        `UPDATE pedigree_claims 
        SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, admin_note = ?
        WHERE id = ?`,
        [status, reviewedBy, adminNote || null, id]
      )
      .then(([rows]) => rows);
  },

  denyPendingByPedigreeExcept: (con, pedigreeId, claimId, reviewedBy) => {
    return con
      .promise()
      .query(
        `UPDATE pedigree_claims 
        SET status = 'denied', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
            admin_note = COALESCE(admin_note, 'Denied automatically after another claim was approved')
        WHERE pedigree_id = ? AND id != ? AND status = 'pending'`,
        [reviewedBy, pedigreeId, claimId]
      )
      .then(([rows]) => rows);
  },

  delete: (con, id) => {
    return con
      .promise()
      .query(`DELETE FROM pedigree_claims WHERE id = ?`, [id])
      .then(([rows]) => rows);
  },
};
