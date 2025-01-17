const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const pool = require("./config/database");

const app = express();
const PORT = 3000;

// Configurazione sessione
app.use(
  session({
    secret: "chiave-segreta", // Cambiare in produzione con una chiave complessa
    resave: false,
    saveUninitialized: false, // Non crea sessioni non necessarie
    cookie: {
      secure: false, // Impostare su true in produzione con HTTPS
      httpOnly: true, // Impedisce accessi JavaScript ai cookie
      maxAge: 3600 * 1000, // Scadenza della sessione (1 ora)
      rolling: true, // Ogni richiesta rinnova la sessione
    },
  })
);

// Configurazione Body Parser
app.use(bodyParser.urlencoded({ extended: true })); // Per dati inviati tramite moduli HTML
app.use(bodyParser.json()); // Per dati JSON inviati tramite Fetch API o altri client

// Percorso statico per i file HTML e JS
app.use(express.static("public"));

// Middleware per controllare l'autenticazione
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login.html");
  }
  next();
};

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
app.post("/login", async (req, res) => {
  const { codice_accesso } = req.body;

  try {
    const query =
      "SELECT id, nome_utente FROM utenti WHERE codice_accesso = $1";
    const result = await pool.query(query, [codice_accesso]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Utente non trovato" });
    }

    const { id, nome_utente } = result.rows[0];
    req.session.userId = id; // Salva l'ID utente nella sessione
    req.session.userName = nome_utente; // Salva il nome utente nella sessione

    res.json({
      success: true,
      redirect: "/dashboard.html",
      id: id,
      nomeUtente: nome_utente,
    });
  } catch (error) {
    console.error("Errore durante il login:", error);
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

// API per salvare un incasso
app.post("/api/incassi", async (req, res) => {
  const {
    importo,
    tipoIncasso,
    tipoPagamento,
    tipoDocumento,
    descrizione,
    operatoreId,
    data,
    ora,
  } = req.body;
  try {
    const query = `
      INSERT INTO incassi (
        importo, tipo_incasso, tipo_pagamento, tipo_documento, descrizione, 
        id_operatore, data, ora
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
    `;
    const result = await pool.query(query, [
      importo,
      tipoIncasso,
      tipoPagamento,
      tipoDocumento,
      descrizione,
      operatoreId,
      data,
      ora,
    ]);
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error("Errore durante il salvataggio dell'incasso:", error);
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

// API per ottenere gli incassi di una specifica data
app.get("/api/incassi/:data", async (req, res) => {
  const { data } = req.params;

  try {
    const query = `
      SELECT 
        incassi.*, 
        utenti.nome_utente AS nome_utente
      FROM 
        incassi
      JOIN 
        utenti
      ON 
        incassi.id_operatore = utenti.id
      WHERE 
        incassi.data = $1
      ORDER BY 
        incassi.ora DESC;
    `;
    const result = await pool.query(query, [data]);
    res.json({ success: true, incassi: result.rows });
  } catch (error) {
    console.error("Errore durante il caricamento degli incassi:", error);
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

// API per rimuovere un incasso
app.delete("/api/incassi/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "DELETE FROM incassi WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Incasso non trovato" });
    }

    res.json({ success: true, message: "Incasso rimosso con successo" });
  } catch (error) {
    console.error("Errore durante la rimozione dell'incasso:", error);
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

// API per modificare un incasso
app.put("/api/incassi/:id", async (req, res) => {
  const { id } = req.params;
  const {
    importo,
    tipoIncasso,
    tipoPagamento,
    tipoDocumento,
    descrizione,
    ora,
  } = req.body;

  try {
    const query = `
      UPDATE incassi 
      SET 
        importo = $1, 
        tipo_incasso = $2, 
        tipo_pagamento = $3, 
        tipo_documento = $4, 
        descrizione = $5, 
        ora = $6
      WHERE id = $7
      RETURNING *;
    `;

    const result = await pool.query(query, [
      importo,
      tipoIncasso,
      tipoPagamento,
      tipoDocumento,
      descrizione,
      ora,
      id,
    ]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Incasso non trovato" });
    }

    res.json({
      success: true,
      message: "Incasso modificato con successo",
      incasso: result.rows[0],
    });
  } catch (error) {
    console.error("Errore durante la modifica dell'incasso:", error);
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login.html");
});

// Dashboard (controlla autenticazione)
app.use(
  "/dashboard.html",
  requireAuth,
  express.static("public/dashboard.html")
);

// Ritorna il nome utente dalla sessione
app.get("/api/utente", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "Non autenticato" });
  }
  // aggiunta console log per debug
  console.log("req.session.userId", req.session.userId);
  console.log("req.session.userName", req.session.userName);

  res.json({
    success: true,
    userId: req.session.userId,
    userName: req.session.userName,
  });
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
