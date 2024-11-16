const mysql = require("mysql2");
require("dotenv").config();

const dbConnect = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

dbConnect.connect((err) => {
  if (err) {
    console.error("Error de conexión a la base de datos: ", err.stack);
    return;
  }
  console.log(
    "Conectado a la base de datos MySQL con id " + dbConnect.threadId
  );
});

module.exports = dbConnect;
