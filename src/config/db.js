const mysql = require("mysql2");
require("dotenv").config();

const dbConnect = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

dbConnect.getConnection((err, connection) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conectado a la base de datos MySQL con id", connection.threadId);
  connection.release();
});

setInterval(() => {
  dbConnect.query("SELECT 1", (err) => {
    if (err) console.error("Error en keep-alive de MySQL:", err);
  });
}, 60000);

module.exports = dbConnect;
