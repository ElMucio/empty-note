# Empty Note

> **EN** — Online notepad web app: registered users create, format, search and export their notes.
> Node.js + Express backend with MySQL, bcrypt password hashing, JWT in httpOnly cookies and
> note content encrypted at rest with AES-256-GCM. Responsive "lined paper" UI in plain HTML, CSS and JavaScript.

> Progetto del corso di **Programmazione Web e Mobile** — Università degli Studi di Perugia, 2026  
> Autore: **Luca Sonno**

Applicazione web che simula un bloc notes online. Gli utenti registrati possono creare, modificare,
organizzare, esportare e cancellare le proprie note, da qualsiasi dispositivo tramite browser.
L'interfaccia riprende l'estetica di un quaderno a righe ed è responsive per desktop, tablet e smartphone.

La proposta di progetto, con palette, scelte stilistiche e mockup delle pagine, è in
[`docs/proposta-progetto.pdf`](docs/proposta-progetto.pdf).

## Funzionalità

- Registrazione e login (con username oppure e-mail), con validazione dei campi nel browser
  e controllo dei dati obbligatori e dell'unicità di username/e-mail lato server
- Creazione, modifica e cancellazione delle note personali
- Editor con formattazione: grassetto, corsivo, sottolineato, allineamento, colore
- Esportazione delle note in `.txt`
- Ricerca tra le proprie note per titolo, in tempo reale
- Due visualizzazioni: a card o a lista
- Bacheca pubblica di post-it nella home, gestita dagli amministratori
- Eliminazione dell'account, con cancellazione automatica di tutte le note

## Sicurezza

- Password salvate come hash **bcrypt** (con sale), mai in chiaro.
- Pagine e API riservate protette da token **JWT** in cookie `httpOnly` con `SameSite=Strict`.
- Contenuto delle note **cifrato nel database con AES-256-GCM**: chi accede al solo database non può leggerle.
- Tutte le query SQL sono **parametrizzate**, contro la SQL injection.
- Ogni nota è accessibile solo al suo proprietario; il pannello di amministrazione è protetto lato server.

## Requisiti

- Node.js 18 o superiore
- MySQL Server 8 o superiore

## Installazione e avvio

1. **Creare il database**, eseguendo `database.sql` (crea il database `empty_note`, le tabelle e i post-it di esempio):
   ```
   mysql -u root -p < database.sql
   ```
2. **Configurare**: copiare `config.example.js` in `config.js` e inserire password di MySQL, chiave JWT e chiave AES.
   Nel file ci sono i comandi per generare le chiavi. `config.js` è escluso dal repository.
3. **Installare le dipendenze**:
   ```
   npm install
   ```
4. **Creare un amministratore** (non ce n'è uno predefinito):
   ```
   node crea-admin.js <username> <email> <password>
   ```
5. **Avviare il server** e aprire <http://localhost:3000>:
   ```
   npm start
   ```
   Se `npm start` dà errore in PowerShell, usare `node server.js` oppure il Prompt dei comandi.

## Struttura

```
server.js              server Express: API, autenticazione, cifratura delle note
config.example.js      modello della configurazione (da copiare in config.js)
crea-admin.js          script per creare un amministratore
database.sql           schema del database e post-it di esempio
public/                pagine accessibili senza login (home, informazioni, login, registrazione)
private/               aree riservate, protette da JWT (dashboard, editor, gestione)
docs/                  proposta di progetto con i mockup
```

## Tecnologie

**Frontend:** HTML5, CSS3 (Flexbox, Grid, media query), JavaScript; Google Fonts e Material Symbols  
**Backend:** Node.js, Express, MySQL (`mysql2`), `jsonwebtoken`, `bcrypt`, `cookie-parser`
