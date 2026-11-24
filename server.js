// server.js -- Cuore del backend.
// Avvia Express, serve i file, gestisce JWT, cifra note e parla con MySQL

// Importazione librerie esterne
const express      = require("express");        // framework HTTP
const mysql        = require("mysql2");         // driver MySQL
const cookieParser = require("cookie-parser");  // per leggere req.cookies
const jwt          = require("jsonwebtoken");   // per creare/verificare token JWT
const bcrypt       = require("bcrypt");         // hashing password
const crypto       = require("crypto");         // modulo nativo per cifratura
const path         = require("path");           // per percorsi file system

// Importo l'oggetto con le costanti di configurazione
const config = require("./config");

// Inizializza l'app Express
const app = express();


// Un pool riutilizza connessioni aperte. Più veloce che aprirne una ogni volta.
const pool = mysql.createPool({
    ...config.DB,                  
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Buffer.from converte la chiave da esadecimale a byte grezzi per crypto
const AES_KEY = Buffer.from(config.AES_KEY_HEX, "hex");
if (AES_KEY.length !== 32) {
    console.error("AES_KEY_HEX in config.js deve essere di 64 caratteri esadecimali (vedi config.example.js).");
    process.exit(1);
}



// La GCM verifica anche se il dato è stato manomesso (con il "tag").
function cifra(testo) {
    const iv = crypto.randomBytes(12);                                         // Initialization Vector casuale
    const cipher = crypto.createCipheriv("aes-256-gcm", AES_KEY, iv);
    let c = cipher.update(testo, "utf8", "base64");                            // decodifica da utf8 e produce base64
    c += cipher.final("base64");
    return {
        contenuto: c,
        iv: iv.toString("base64"),                                             // Salviamo anche l'IV e il tag per decifrare poi
        tag: cipher.getAuthTag().toString("base64")
    };
}

function decifra(c, ivB64, tagB64) {
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", AES_KEY, iv);
    decipher.setAuthTag(tag);                                                  // GCM controlla il tag al final() per vedere se i dati sono sani
    let t = decipher.update(c, "base64", "utf8");
    t += decipher.final("utf8");
    return t;
}


// protezione rotte private
// authenticateToken verifica che l'utente abbia un JWT valido nel cookie.
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect(302, "/login.html");                       // Se non c'è token, rimanda al login
    try {
        req.user = jwt.verify(token, config.JWT_SECRET);                       // Decodifica il JWT e lo salva per usarlo dopo
        next();                                                                // in quanto tutto ok passa alla prossima funzione
    } catch (err) {
        return res.redirect(302, "/login.html");                               // Token falso o scaduto
    }
}

// adminOnly si assicura che chi chiama sia un amministratore. Da usare dopo authenticateToken.
function adminOnly(req, res, next) {
    if (!req.user || req.user.ruolo !== "amministratore") {
        return res.status(403).json({ success: false, message: "Accesso non autorizzato" });
    }
    next();
}


// Configurazione globale Express
app.use(express.json());          // legge il body delle req in formato JSON
app.use(cookieParser());          // decodifica i cookie
app.use(express.static("public"));// serve cartella pubblica (accessibile a tutti)

// Pagina gestione bacheca: se non sei admin torni alla dashboard
app.get("/private/gestione.html", authenticateToken, (req, res) => {
    if (req.user.ruolo !== "amministratore") {
        return res.redirect(302, "/private/dashboard.html");
    }
    res.sendFile(path.join(__dirname, "private", "gestione.html"));
});

// Tutto il resto in "private" è accessibile solo se authenticateToken non ti blocca
app.use("/private", authenticateToken, express.static("private"));







// Registrazione
// Riceve i dati utente, fa l'hash della password e li salva in DB.
app.post("/api/registrazione", async (req, res) => {
    const { nome, cognome, genere, data_nascita, email, username, password } = req.body;
    if (!nome || !cognome || !email || !username || !password) {
        return res.status(400).json({ success: false, message: "Dati mancanti" });
    }
    try {
        const hash = await bcrypt.hash(password, 10);                          // rallentiamo di proposito (costo 10)
        await pool.promise().execute(
            "INSERT INTO utenti (nome, cognome, genere, data_nascita, email, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [nome, cognome, genere || null, data_nascita || null, email, username, hash]
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            // Un vincolo UNIQUE in MySQL è stato violato (email o username)
            return res.status(409).json({ success: false, message: "E-mail o username gia' in uso" });
        }
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Login
// Controlla credenziali e, se ok, invia un cookie con il JWT.
app.post("/api/login", async (req, res) => {
    const { identificativo, password } = req.body;
    if (!identificativo || !password) {
        return res.status(400).json({ success: false, message: "Dati mancanti" });
    }
    try {
        // Cerca per email OPPURE username insieme
        const [righe] = await pool.promise().execute(
            "SELECT id, nome, username, password, ruolo FROM utenti WHERE email = ? OR username = ?",
            [identificativo, identificativo]
        );
        if (righe.length === 0) {
            return res.status(401).json({ success: false, message: "Credenziali non valide" });
        }
        const utente = righe[0];
        const ok = await bcrypt.compare(password, utente.password);            // compara testo con l'hash
        if (!ok) {
            return res.status(401).json({ success: false, message: "Credenziali non valide" });
        }
        // Prepariamo i dati da mettere nel JWT
        const payload = {
            userId: utente.id,
            userName: utente.nome,
            userUsername: utente.username,
            ruolo: utente.ruolo
        };
        const token = jwt.sign(payload, config.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
        // Impostiamo il token nel cookie (httpOnly blocca lettura da JS client contro XSS)
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "Strict",
            maxAge: 3600000
        });
        res.json({ success: true, ruolo: utente.ruolo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Logout
// Toglie semplicemente il cookie per sloggare l'utente
app.post("/api/logout", authenticateToken, (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
});


// Info Utente Loggato
// Usato dal frontend per salutare l'utente o nascondere/mostrare bottoni in base al ruolo
app.get("/api/userinfo", authenticateToken, (req, res) => {
    res.json({
        success: true,
        nome: req.user.userName,
        username: req.user.userUsername,
        ruolo: req.user.ruolo
    });
});


// Check disponibilità email/username
// Chiamato via JS nel frontend mentre si digita, per dare risuktati in tempo reale
app.get("/api/check-availability", async (req, res) => {
    const { campo, valore } = req.query;
    if (!campo || !valore) {
        return res.status(400).json({ success: false, message: "Parametri mancanti" });
    }
    // evitare che il campo sia codice SQL malevolo
    if (campo !== "email" && campo !== "username") {
        return res.status(400).json({ success: false, message: "Campo non valido" });
    }
    try {
        const colonna = (campo === "email") ? "email" : "username";
        const [righe] = await pool.promise().execute(
            "SELECT id FROM utenti WHERE " + colonna + " = ? LIMIT 1",
            [valore]
        );
        res.json({ success: true, disponibile: righe.length === 0 });          // true se non trova nulla
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});




// prende tutte le note di un utente - CRUD
// Utilizzato nella dashboard
app.get("/api/note", authenticateToken, async (req, res) => {
    try {
        const [righe] = await pool.promise().execute(
            "SELECT id, titolo, contenuto_cifrato, iv, tag, data_modifica FROM note WHERE utente_id = ? ORDER BY data_modifica DESC",
            [req.user.userId]                                                  // id preso dal JWT, così nessuno legge le note degli altri
        );
        // Decifra il testo per crearne una piccola preview pulita dai tag HTML
        const note = righe.map(r => {
            let anteprima = "";
            if (r.contenuto_cifrato && r.iv && r.tag) {
                try {
                    const html = decifra(r.contenuto_cifrato, r.iv, r.tag);
                    anteprima = html.replace(/<[^>]+>/g, "").trim().substring(0, 120);
                } catch (e) {}
            }
            return { id: r.id, titolo: r.titolo, anteprima: anteprima, data_modifica: r.data_modifica };
        });
        res.json({ success: true, note });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Crea nota vuota
// Ritorna l'id così il client sa dove redirezionale
app.post("/api/note", authenticateToken, async (req, res) => {
    try {
        const c = cifra("");
        const [risultato] = await pool.promise().execute(
            "INSERT INTO note (utente_id, titolo, contenuto_cifrato, iv, tag) VALUES (?, ?, ?, ?, ?)",
            [req.user.userId, "Nota senza titolo", c.contenuto, c.iv, c.tag]
        );
        res.json({ success: true, id: risultato.insertId });                   // insertId è l'id AUTO_INCREMENT appena creato
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Prende nota singola per aprirla nell'editor
app.get("/api/note/:id", authenticateToken, async (req, res) => {
    try {
        const [righe] = await pool.promise().execute(
            "SELECT id, titolo, contenuto_cifrato, iv, tag FROM note WHERE id = ? AND utente_id = ?",
            [req.params.id, req.user.userId]
        );
        if (righe.length === 0) {
            return res.status(404).json({ success: false, message: "Nota non trovata" });
        }
        const r = righe[0];
        let contenuto = "";
        if (r.contenuto_cifrato && r.iv && r.tag) {
            contenuto = decifra(r.contenuto_cifrato, r.iv, r.tag);
        }
        res.json({ success: true, id: r.id, titolo: r.titolo, contenuto });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Salva/Aggiorna una nota
app.put("/api/note/:id", authenticateToken, async (req, res) => {
    const { titolo, contenuto } = req.body;
    if (typeof titolo !== "string" || typeof contenuto !== "string") {
        return res.status(400).json({ success: false, message: "Dati mancanti" });
    }
    try {
        const c = cifra(contenuto);
        const tit = titolo.trim() || "Nota senza titolo";
        const [risultato] = await pool.promise().execute(
            "UPDATE note SET titolo = ?, contenuto_cifrato = ?, iv = ?, tag = ? WHERE id = ? AND utente_id = ?",
            [tit, c.contenuto, c.iv, c.tag, req.params.id, req.user.userId]
        );
        if (risultato.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Nota non trovata" });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Elimina nota
app.delete("/api/note/:id", authenticateToken, async (req, res) => {
    try {
        const [risultato] = await pool.promise().execute(
            "DELETE FROM note WHERE id = ? AND utente_id = ?",
            [req.params.id, req.user.userId]
        );
        if (risultato.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Nota non trovata" });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Esporta in .txt
// Invece di JSON mandiamo un file di testo da scaricare
app.get("/api/note/:id/export", authenticateToken, async (req, res) => {
    try {
        const [righe] = await pool.promise().execute(
            "SELECT titolo, contenuto_cifrato, iv, tag FROM note WHERE id = ? AND utente_id = ?",
            [req.params.id, req.user.userId]
        );
        if (righe.length === 0) return res.status(404).send("Nota non trovata");
        const r = righe[0];
        let testo = r.titolo + "\r\n\r\n";
        if (r.contenuto_cifrato && r.iv && r.tag) {
            const html = decifra(r.contenuto_cifrato, r.iv, r.tag);
            // Sostituisco break line e fine paragrafi in a capo (\r\n)
            const testoNota = html
                .replace(/<br\s*\/?>/gi, "\r\n")
                .replace(/<\/p>/gi, "\r\n")
                .replace(/<\/div>/gi, "\r\n")
                .replace(/<\/li>/gi, "\r\n")
                .replace(/<[^>]+>/g, "")                    // pulisce il resto
                .replace(/\r\n(\r\n)+/g, "\r\n\r\n")       // unisce tanti a capo vuoti per risparmiare
                .trim();
            testo += testoNota;
        }
        // Pulizia nome file per togliere slash o caratteri strani
        const nomeFile = r.titolo.replace(/[^a-zA-Z0-9-_ ]/g, "_") + ".txt";
        // Header per dirgli che è un allegato
        res.setHeader("Content-Disposition", 'attachment; filename="' + nomeFile + '"');
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(testo);
    } catch (err) {
        console.error(err);
        res.status(500).send("Errore del server");
    }
});

// post-it
// Pubblica, per popolare la index del sito
app.get("/api/bacheca", async (req, res) => {
    try {
        const [righe] = await pool.promise().execute(
            "SELECT id, titolo, testo, colore, ordine FROM bacheca ORDER BY ordine"
        );
        res.json({ success: true, bacheca: righe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});


// Aggiorna tutta la bacheca in un colpo
// Solo per admin, usa una Transazione SQL. Cancella tutto e reinserisce.
app.put("/api/bacheca", authenticateToken, adminOnly, async (req, res) => {
    const { note } = req.body;
    if (!Array.isArray(note)) {
        return res.status(400).json({ success: false, message: "Formato non valido" });
    }
    const coloriValidi = ["giallo", "rosa", "verde", "azzurro"];
    
    // Per le transazioni non va bene usare pool generico, bisogna prendere 1 connessione esclusiva
    const connessione = await pool.promise().getConnection();
    try {
        await connessione.beginTransaction();
        await connessione.execute("DELETE FROM bacheca");  
        for (let i = 0; i < note.length; i++) {
            const n = note[i];
            if (!n.titolo || !n.testo) continue;
            const colore = coloriValidi.includes(n.colore) ? n.colore : "giallo";
            await connessione.execute(
                "INSERT INTO bacheca (titolo, testo, colore, ordine) VALUES (?, ?, ?, ?)",
                [n.titolo, n.testo, colore, i]
            );
        }
        await connessione.commit();                                            // OK, salva davvero le modifiche
        res.json({ success: true, totale: note.length });
    } catch (err) {
        await connessione.rollback();      
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    } finally {
        connessione.release();                                                 // ridà la connessione al pool
    }
});

// Elimina proprio profilo
// I suoi dati (note incluse) vanno via in auto grazie al CASCADE su MySQL
app.delete("/api/utente", authenticateToken, async (req, res) => {
    try {
        await pool.promise().execute("DELETE FROM utenti WHERE id = ?", [req.user.userId]);
        res.clearCookie("token");
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});

// Accendi server
app.listen(config.PORT, () => {
    console.log("Empty Note avviato su http://localhost:" + config.PORT);
});
