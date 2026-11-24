// Modello del file di configurazione.
// Copiarlo in config.js (escluso da git) e sostituire i valori segnaposto:
//   copy config.example.js config.js      (Windows)
//   cp config.example.js config.js        (Linux / macOS)

// module.exports esporta l'oggetto in modo che altri file possano usare require()
module.exports = {

    // Porta TCP per il server Express
    PORT: 3000,

    // Chiave per firmare i JWT: una stringa lunga e casuale.
    // Per generarla: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
    JWT_SECRET: "SOSTITUIRE_CON_UNA_STRINGA_LUNGA_E_CASUALE",

    // Chiave AES-256 con cui si cifrano le note: 64 caratteri esadecimali.
    // Per generarla: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    // Attenzione: se la si cambia, le note gia' salvate non si possono piu' decifrare.
    AES_KEY_HEX: "SOSTITUIRE_CON_64_CARATTERI_ESADECIMALI",

    // Parametri per collegarsi al DB MySQL. L'oggetto viene passato al createPool.
    DB: {
        host: "localhost",
        user: "root",
        password: "SOSTITUIRE_CON_LA_PASSWORD_DI_MYSQL",
        // Il nome deve coincidere con quello di database.sql
        database: "empty_note"
    }
};
