const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const pool = require("./config/database");

const app = express();
const PORT = 3000;

// Configurazione sessione
app.use(
  session({
    secret: "chiave-segreta",
    resave: false,
    saveUninitialized: true,
  })
);

// Configurazione Body Parser
app.use(bodyParser.urlencoded({ extended: true })); // Per dati inviati tramite moduli HTML (form)
app.use(bodyParser.json()); // Per dati JSON inviati tramite Fetch API o altri client

// Percorso statico per i file HTML
app.use(express.static("public"));

// Rotte
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// Registrazione
app.post("/register", async (req, res, next) => {
  const { nome_utente, codice_accesso } = req.body;

  try {
    const query = `INSERT INTO utenti (nome_utente, codice_accesso) VALUES ($1, $2)`;
    await pool.query(query, [nome_utente, codice_accesso]);
    res.redirect("/login.html");
  } catch (err) {
    next(
      new Error(
        "Errore durante la registrazione. Il nome utente potrebbe essere già registrato."
      )
    );
  }
});

// Login
app.post("/login", async (req, res, next) => {
  const { codice_accesso } = req.body;

  console.log("Codice di accesso ricevuto:", codice_accesso);

  try {
    const query = `SELECT * FROM utenti WHERE codice_accesso = $1`;
    const result = await pool.query(query, [codice_accesso]);

    console.log("Risultato query:", result.rows);

    const user = result.rows[0];
    if (!user) {
      console.log(
        "Nessun utente trovato con il codice di accesso:",
        codice_accesso
      );
      return res.status(401).json({
        success: false,
        message: "Utente non trovato. Riprova con un altro codice.",
      });
    }

    req.session.userId = user.id;
    req.session.userPowerLevel = user.livello_potere;
    res.json({ success: true, redirect: "/dashboard.html" });
  } catch (err) {
    console.error("Errore durante il login:", err.message);
    next(err);
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login.html");
});

// Dashboard
app.get("/dashboard.html", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login.html");
  }
  res.sendFile(__dirname + "/views/dashboard.html");
});

// Middleware per gestire gli errori
app.use((err, req, res, next) => {
  console.error("Errore:", err.message);
  if (req.xhr || req.headers.accept.indexOf("json") > -1) {
    res.status(err.status || 500).json({ error: err.message });
  } else {
    res.status(err.status || 500).send(`
      <h1>Errore: ${err.message}</h1>
      <a href="/">Torna alla Home</a>
    `);
  }
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
