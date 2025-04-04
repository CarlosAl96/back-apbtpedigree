module.exports = {
  get: (con, params, condition, callback) => {
    con.query(
      ` SELECT pedigree.*, 
        user.username AS entered_by_name,
        father.name AS father_name, 
        father.beforeNameTitles AS father_beforeNameTitles, 
        father.afterNameTitles AS father_afterNameTitles, 
        mother.name AS mother_name, 
        mother.beforeNameTitles AS mother_beforeNameTitles, 
        mother.afterNameTitles AS mother_afterNameTitles 
        FROM dogsBackUp2 AS pedigree 
        LEFT JOIN users AS user ON pedigree.entered_by = user.id
        LEFT JOIN dogsBackUp2 AS father ON pedigree.father_id = father.id
        LEFT JOIN dogsBackUp2 AS mother ON pedigree.mother_id = mother.id ${condition}`,
      params,
      callback
    );
  },
  getCount: (con, params, condition) => {
    return con
      .promise()
      .query(
        `SELECT COUNT(*) as count FROM dogsBackUp2 AS pedigree ${condition}`,
        params
      )
      .then(([rows]) => rows);
  },
  getById: (con, id) => {
    return con
      .promise()
      .query(
        `SELECT dogsBackUp2.*, user.username AS entered_by_name FROM dogsBackUp2 INNER JOIN users AS user ON dogsBackUp2.entered_by = user.id WHERE dogsBackUp2.id=${id}`
      )
      .then(([rows]) => rows);
  },

  updateViewsCount: (con, id, callback) => {
    con.query(`UPDATE  dogsBackUp2 SET seen=seen+1 WHERE id=${id}`, callback);
  },

  getFather: (con, idFather) => {
    return con
      .promise()
      .query(`SELECT * FROM  dogsBackUp2 WHERE id=${idFather}`)
      .then(([rows]) => rows);
  },

  getMother: (con, idMother) => {
    return con
      .promise()
      .query(`SELECT * FROM  dogsBackUp2 WHERE id=${idMother}`)
      .then(([rows]) => rows);
  },

  changePermissions: (con, private, id, callback) => {
    con.query(
      `UPDATE  dogsBackUp2 SET private=${private} WHERE id=${id}`,
      callback
    );
  },

  updateImg: (con, img, id, callback) => {
    con.query(`UPDATE  dogsBackUp2 SET img='${img}' WHERE id=${id}`, callback);
  },

  changeOwnership: (con, id, idNewOwner, owner, description) => {
    try {
      const query = `
        UPDATE  dogsBackUp2 
        SET user_id = ?, entered_by = ?, owner = ?, descriptionOwner = ? 
        WHERE id = ?`;

      const results = con
        .promise()
        .query(query, [idNewOwner, idNewOwner, owner, description, id]);

      if (results.affectedRows === 0) {
        throw new Error("No se encontró un registro para actualizar");
      }
      return true;
    } catch (error) {
      throw error;
    }
  },

  delete: (con, id, callback) => {
    con.query(`DELETE FROM  dogsBackUp2 WHERE id=${id}`, callback);
  },

  getBrothers: (con, id, idFather, idMother) => {
    return con
      .promise()
      .query(
        `SELECT 
        siblings.*, 
        father.name AS father_name, 
        father.beforeNameTitles AS father_beforeNameTitles, 
        father.afterNameTitles AS father_afterNameTitles, 
        mother.name AS mother_name, 
        mother.beforeNameTitles AS mother_beforeNameTitles, 
        mother.afterNameTitles AS mother_afterNameTitles 
      FROM  dogsBackUp2 AS siblings
      LEFT JOIN  dogsBackUp2 AS father ON siblings.father_id = father.id
      LEFT JOIN  dogsBackUp2 AS mother ON siblings.mother_id = mother.id
      WHERE 
        (siblings.father_id = ? OR siblings.mother_id = ?)
        AND siblings.id != ? AND siblings.mother_id != 0 AND siblings.father_id != 0`,
        [idFather, idMother, id]
      )
      .then(([rows]) => rows);
  },

  getChildren: (con, id) => {
    return con
      .promise()
      .query(
        `SELECT 
        children.*, 
        father.name AS father_name, 
        father.beforeNameTitles AS father_beforeNameTitles, 
        father.afterNameTitles AS father_afterNameTitles, 
        mother.name AS mother_name, 
        mother.beforeNameTitles AS mother_beforeNameTitles, 
        mother.afterNameTitles AS mother_afterNameTitles 
      FROM  dogsBackUp2 AS children
      LEFT JOIN  dogsBackUp2 AS father ON children.father_id = father.id
      LEFT JOIN  dogsBackUp2 AS mother ON children.mother_id = mother.id
      WHERE children.father_id = ? OR children.mother_id = ?`,
        [id, id]
      )
      .then(([rows]) => rows);
  },

  savePedigree: (con, data, callback) => {
    con.query(
      `INSERT INTO  dogsBackUp2 (
          name,
          beforeNameTitles,
          afterNameTitles,
          description,
          owner,
          entered_by,
          breeder,
          callname,
          sex,
          registration,
          color,
          birthdate,
          conditioned_weight,
          chain_weight,
          img,
          father_id,
          mother_id,
          user_id,
          status,
          fightcolor,
          title,
          seen,
          private,
          created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )`,
      [
        data.name,
        data.beforeNameTitles,
        data.afterNameTitles,
        data.description,
        data.owner,
        data.user_id,
        data.breeder,
        data.callname,
        data.sex,
        data.registration,
        data.color,
        data.birthdate,
        data.conditioned_weight,
        data.chain_weight,
        data.img,
        data.father_id,
        data.mother_id,
        data.user_id,
        "LIVE",
        data.fightcolor,
        0,
        0,
        false,
      ],
      callback
    );
  },

  updatePedigree: (con, data, id, callback) => {
    con.query(
      `UPDATE  dogsBackUp2 SET
        name = ?,
        beforeNameTitles = ?,
        afterNameTitles = ?,
        description = ?,
        owner = ?,
        breeder = ?,
        callname = ?,
        sex = ?,
        registration = ?,
        color = ?,
        birthdate = ?,
        conditioned_weight = ?,
        chain_weight = ?,
        img = ?,
        father_id = ?,
        mother_id = ?,
        fightcolor = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}`,
      [
        data.name,
        data.beforeNameTitles,
        data.afterNameTitles,
        data.description,
        data.owner,
        data.breeder,
        data.callname,
        data.sex,
        data.registration,
        data.color,
        data.birthdate,
        data.conditioned_weight,
        data.chain_weight,
        data.img,
        data.father_id,
        data.mother_id,
        data.fightcolor,
      ],
      callback
    );
  },

  deletePedigree: (con, id, callback) => {
    con.query(`DELETE FROM  dogsBackUp2 WHERE id = ?`, [id], callback);
  },

  updatePrivateStatus: (con, id, privateStatus, callback) => {
    con.query(
      `UPDATE  dogsBackUp2 
       SET private = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [privateStatus, id],
      callback
    );
  },

  changeOwner: (con, id, newUserId, newDescriptionOwner, callback) => {
    con.query(
      `UPDATE  dogsBackUp2 
       SET user_id = ?, 
           descriptionOwner = ?, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newUserId, newDescriptionOwner, id],
      callback
    );
  },

  getLogs: (con, id, callback) => {
    con.query(
      `SELECT dogs_log.*, users.username FROM dogs_log INNER JOIN users ON dogs_log.user_id = users.id WHERE dog_id = ${id} ORDER BY id DESC`,
      callback
    );
  },
};
