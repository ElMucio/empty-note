// Script da terminale per creare un utente amministratore.
// Si lancia con: node crea-admin.js <username> <email> <password> // NOTATO ANCHE SUL FILE README

const mysql  = require("mysql2");
const bcrypt = require("bcrypt");
// Importiamo i dati di connessione dal config
const config = require("./config");

// process.argv contiene gli argomenti passati da terminale.
// Se sono meno di 5 (node, script, e i 3 argomenti), scriviamo cosa manca/uso corretto.
if (process.argv.length < 5) {
    console.log("Uso: node crea-admin.js <username> <email> <password>"); //cosi gestiamo anche errori futuri
    process.exit(1);
}

// Estraiamo username, email e password ignorando i primi due argomenti (eseguibile e script)
const [, , username, email, password] = process.argv;

// Creiamo un mini-pool di connessioni
const pool = mysql.createPool({ ...config.DB, connectionLimit: 2 });

(async () => {
    try {
        // Genera l'hash della password con bcrypt
        const hash = await bcrypt.hash(password, 10);
        // Esegue una query parametrizzata: i ? evitano le SQL injection
        await pool.promise().execute(
            // Inserisce l'utente forzando il ruolo "amministratore" a mano
            "INSERT INTO utenti (nome, cognome, email, username, password, ruolo) " +
            "VALUES (?, ?, ?, ?, ?, 'amministratore')",
            ["Amministratore", "Empty Note", email, username, hash] // ovviamente segue le sintassi precise con la quale si è creato il db
        );
        console.log("Amministratore '" + username + "' creato con successo.");
    } catch (err) {

        // ER_DUP_ENTRY indica che username o email sono già nel DB
        if (err.code === "ER_DUP_ENTRY") {
            console.error("Errore: email o username gia' presenti nel database.");
        } else {
            console.error("Errore:", err.message);
        }
    } finally {
        await pool.end();
    }
})();
