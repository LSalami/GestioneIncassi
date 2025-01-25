const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const Sequelize = require("sequelize");
const SequelizeStore = require("connect-session-sequelize")(session.Store);

const pool = require("./config/database");
const path = require("path");

const app = express();
const PORT = 3000;

const sequelize = new Sequelize("gestioneincassi", "admin", "admin", {
  host: "localhost",
  dialect: "postgres",
  logging: false,
});

// Configurazione store delle sessioni
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: "sessions", // Tabella per le sessioni
  checkExpirationInterval: 60 * 1000, // Controllo ogni minuto
  expiration: 60 * 60 * 1000, // Durata di 60 minuti per le sessioni
});

app.use(
  session({
    store: sessionStore,
    secret: "chiave-segreta",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true, // Impedisce accessi JavaScript ai cookie
      sameSite: "strict",
      maxAge: 3600 * 1000, // 1 ora
    },
  })
);

// Sincronizzazione della tabella delle sessioni
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connessione al database riuscita.");
    await sessionStore.sync(); // Crea o aggiorna la tabella delle sessioni
    console.log("Tabella delle sessioni sincronizzata.");
  } catch (error) {
    console.error("Errore durante la connessione al database:", error);
  }
})();

// Configurazione Body Parser
app.use(bodyParser.urlencoded({ extended: true })); // Per dati inviati tramite moduli HTML
app.use(bodyParser.json()); // Per dati JSON inviati tramite Fetch API o altri client

// Percorso statico per i file HTML e JS
app.use(express.static(path.join(__dirname, "public")));

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

// Login
app.post("/login", async (req, res) => {
  const { codice_accesso } = req.body;

  try {
    const query =
      "SELECT id, nome_utente, livello_potere FROM utenti WHERE codice_accesso = $1";
    const result = await pool.query(query, [codice_accesso]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Utente non trovato" });
    }

    const { id, nome_utente, livello_potere } = result.rows[0];
    req.session.userId = id; // Salva l'ID utente nella sessione
    req.session.userName = nome_utente; // Salva il nome utente nella sessione
    req.session.userPower = livello_potere; // Salva il livello di potere dell'utente nella sessione

    // Risposta JSON con reindirizzamento alla dashboard
    res.json({
      success: true,
      redirect: "/dashboard.html",
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
        utenti.nome_utente AS nome_utente,
        utenti.livello_potere AS livello_potere
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

// API per aggiornare il totale della cassa
app.put("/api/aggiorna-totale-cassa", async (req, res) => {
  const { importo, operazione } = req.body;

  if (!importo || !operazione) {
    return res.status(400).json({
      success: false,
      message: "Importo o operazione non forniti",
    });
  }

  // Validazione dell'operazione
  if (!["somma", "sottrazione"].includes(operazione)) {
    return res.status(400).json({
      success: false,
      message: "Operazione non valida. Usa 'somma' o 'sottrazione'.",
    });
  }

  try {
    let query;
    const params = [importo];

    // Imposta la query in base all'operazione
    if (operazione === "somma") {
      query =
        "UPDATE cassa SET totale = totale + $1, data_aggiornamento = NOW()";
    } else if (operazione === "sottrazione") {
      query =
        "UPDATE cassa SET totale = totale - $1, data_aggiornamento = NOW()";
    }

    // Esegui la query
    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Totale cassa non trovato",
      });
    }

    res.json({
      success: true,
      message: "Totale cassa aggiornato con successo",
    });
  } catch (error) {
    console.error("Errore durante l'aggiornamento del totale cassa:", error);
    res.status(500).json({
      success: false,
      message: "Errore del server durante l'aggiornamento del totale cassa",
    });
  }
});

// API per ottenere il totale della cassa
app.get("/api/totale-cassa", async (req, res) => {
  try {
    const query = "SELECT totale, data_aggiornamento FROM cassa LIMIT 1";
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Totale cassa non trovato",
      });
    }

    const { totale, data_aggiornamento } = result.rows[0];
    res.json({
      success: true,
      totale,
      dataAggiornamento: data_aggiornamento,
    });
  } catch (error) {
    console.error("Errore durante il recupero del totale cassa:", error);
    res.status(500).json({
      success: false,
      message: "Errore del server durante il recupero del totale cassa",
    });
  }
});

// API per la ricerca degli incassi
app.get("/api/ricerca-incassi", async (req, res) => {
  const { anno, descrizione, tipoIncasso, tipoPagamento } = req.query;

  let query = "SELECT * FROM incassi WHERE 1=1";
  const params = [];

  if (anno) {
    query += ` AND EXTRACT(YEAR FROM data) = $${params.length + 1}`;
    params.push(anno);
  }

  if (descrizione) {
    query += ` AND descrizione ILIKE $${params.length + 1}`;
    params.push(`%${descrizione}%`); // Cerca nella descrizione (case-insensitive)
  }

  if (tipoIncasso) {
    query += ` AND tipo_incasso = $${params.length + 1}`;
    params.push(tipoIncasso);
  }

  if (tipoPagamento) {
    query += ` AND tipo_pagamento = $${params.length + 1}`;
    params.push(tipoPagamento);
  }

  query += " ORDER BY id DESC";

  try {
    const result = await pool.query(query, params);
    res.json({ success: true, incassi: result.rows });
  } catch (error) {
    console.error("Errore durante la ricerca:", error);
    res.status(500).json({ success: false, message: "Errore del server" });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Errore durante il logout:", err);
      return res
        .status(500)
        .json({ success: false, message: "Errore nel logout" });
    }
    res.clearCookie("connect.sid"); // Sostituisci con il nome del tuo cookie di sessione se diverso
    res.json({ success: true });
  });
});

// Dashboard (controlla autenticazione)
app.use(
  "/dashboard.html",
  requireAuth,
  express.static("public/dashboard.html")
);

// Ritorna l'utente dalla sessione
app.get("/api/utente", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "Non autenticato" });
  }

  res.json({
    success: true,
    userId: req.session.userId,
    userName: req.session.userName,
    userPower: req.session.userPower,
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
