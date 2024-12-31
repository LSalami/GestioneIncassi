const { Pool } = require("pg");

// Configurazione del database
const pool = new Pool({
  user: "admin", // Nome utente del database
  host: "localhost", // Host del database (di default è localhost)
  database: "gestioneincassi", // Nome del database
  password: "admin", // Password dell'utente
  port: 5432, // Porta di default di PostgreSQL
});

// Test della connessione
pool.connect((err) => {
  if (err) {
    console.error("Errore di connessione al database:", err);
  } else {
    console.log("Connesso a PostgreSQL - Database gestioneincassi.");
  }
});

module.exports = pool;
