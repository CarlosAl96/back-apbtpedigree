module.exports = {
  get: (con, params, condition, callback) => {
    con.query(`SELECT * FROM dogsbackup2 ${condition}`, params, callback);
  },
  getCount: (con, params, condition) => {
    return con
      .promise()
      .query(`SELECT COUNT(*) as count FROM dogsbackup2 ${condition}`, params)
      .then(([rows]) => rows);
  },
  getById: (con, id) => {
    return con
      .promise()
      .query(`SELECT * FROM dogsbackup2 WHERE id=${id}`)
      .then(([rows]) => rows);
  },

  getFather: (con, idFather) => {
    return con
      .promise()
      .query(`SELECT * FROM dogsbackup2 WHERE id=${idFather}`)
      .then(([rows]) => rows);
  },

  getMother: (con, idMother) => {
    return con
      .promise()
      .query(`SELECT * FROM dogsbackup2 WHERE id=${idMother}`)
      .then(([rows]) => rows);
  },

  changePermissions: (con, editable, id, callback) => {
    con.query(
      `UPDATE dogsbackup2 SET editable=${editable} WHERE id=${id}`,
      callback
    );
  },

  changeOwner: (con, id, idNewOwner, owner, callback) => {
    con.query(
      `UPDATE dogsbackup2 SET user_id=${idNewOwner}, owner=${owner} WHERE id=${id}`,
      callback
    );
  },

  delete: (con, id, callback) => {
    con.query(`DELETE FROM dogsbackup2 WHERE WHERE id=${id}`, callback);
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
      FROM dogsbackup2 AS siblings
      LEFT JOIN dogsbackup2 AS father ON siblings.father_id = father.id
      LEFT JOIN dogsbackup2 AS mother ON siblings.mother_id = mother.id
      WHERE 
        (siblings.father_id = ? OR siblings.mother_id = ?)
        AND siblings.id != ?`,
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
      FROM dogsbackup2 AS children
      LEFT JOIN dogsbackup2 AS father ON children.father_id = father.id
      LEFT JOIN dogsbackup2 AS mother ON children.mother_id = mother.id
      WHERE children.father_id = ? OR children.mother_id = ?`,
        [id, id]
      )
      .then(([rows]) => rows);
  },

  savePedigree: (con, data, callback) => {
    con.query(
      `INSERT INTO users (username, password, first_name, last_name, email, phone_number, ip, street, city, state, country, zip_code, picture, is_superuser, stateOnline, adminuser, is_staff, is_active, last_login, date_joined, payment_at)
	VALUES ('${data.username}','${data.password}','${data.first_name}','${
        data.last_name
      }','${data.email}','${data.phone_number}','${data.ip}','${
        data.street
      }','${data.city}','${data.state}','${data.country}','${data.zip_code}','${
        data.picture
      }', ${false}, ${false}, ${false}, ${false}, ${false}, ${null}, CURRENT_TIMESTAMP, ${null})`,
      callback
    );
  },
};
