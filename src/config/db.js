// const mysql = require("mysql2");
// require("dotenv").config();

// const dbConnect = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   idleTimeout: 60000,
//   enableKeepAlive: true,
//   keepAliveInitialDelay: 10000,
// });

// dbConnect.connect((err) => {
//   if (err) {
//     console.error("Error de conexión a la base de datos: ", err.stack);
//     return;
//   }
//   console.log(
//     "Conectado a la base de datos MySQL con id " + dbConnect.threadId
//   );
// });

// module.exports = dbConnect;

const mysql = require("mysql2");
require("dotenv").config();

const dbConnect = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Número máximo de conexiones activas
  queueLimit: 0, // Sin límite en la cola de espera
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Manejo de errores en la conexión
dbConnect.getConnection((err, connection) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
    return;
  }
  console.log("Conectado a la base de datos MySQL con id", connection.threadId);
  connection.release(); // Liberamos la conexión después de probarla
});

// Función para mantener la conexión activa
setInterval(() => {
  dbConnect.query("SELECT 1", (err) => {
    if (err) console.error("Error en keep-alive de MySQL:", err);
  });
}, 60000); // Cada 60 segundos

module.exports = dbConnect; // Exportamos el pool con promesas
