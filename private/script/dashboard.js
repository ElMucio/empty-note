// dashboard.js
// Elabora su "dashboard.html" (l'elenco delle note dell'utente loggato).


document.addEventListener("DOMContentLoaded", function () {

  // caricaUtenteCorrente() e' definita in comune.js, restituisce una Promise con i dati 
  // dell'utente loggato (o null se non loggato).

  caricaUtenteCorrente().then(function (utente) {
    if (utente) {
      // querySelector accetta un selettore CSS (<h1> con classe "titolo-pagina" del file css)
      const titolo = document.querySelector("h1.titolo-pagina");

      // textContent imposta il testo interno dell'elemento e a differenza di innerHTML,
      // non interpreta eventuali tag HTML.
      if (titolo) titolo.textContent = "Ciao, " + utente.nome;
    }
    
    // mostra/nasconde la voce di menu "Gestione" se l'utente
    // e' amministratore.
    aggiornaNavigazionePerRuolo(utente);
  });

  // Recupero i riferimenti agli elementi della pagina piu usati.
  // Li salvo in variabili const per non doverli ricercare nel DOM ogni volta
  const griglia = document.getElementById("note-griglia");        // contenitore delle card
  const conteggio = document.getElementById("conteggio");         // numero "n note"
  const ricerca = document.getElementById("ricerca");
  const nessunRisultato = document.getElementById("nessun-risultato");
  const statoVuoto = document.getElementById("stato-vuoto");      // messaggio "nessuna nota"
  const toggleVista = document.getElementById("toggle-vista");    // i due bottoni griglia/lista

  // Formatta una data (es. "2025-10-12T14:33:00.000Z") in "gg/mm/aaaa".
  function formattaData(d) {
    const dt = new Date(d); // costruisce un oggetto Date a partire dalla stringa

    // padStart(2, "0") = se la stringa e' lunga 1 carattere, ci aggiunge uno "0" davanti.
    // Cosi' "5" diventa "05"
    const gg = String(dt.getDate()).padStart(2, "0");

    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    return gg + "/" + mm + "/" + dt.getFullYear();
  }

  // Costruisce e restituisce un nuovo elemento <article> che rappresenta la card
  // di una nota.
  function creaCardNota(nota) {

    // createElement crea un nuovo nodo.
    const articolo = document.createElement("article");

    // Imposto il css.
    articolo.className = "nota-card";

    // dataset = scorciatoia per leggere/scrivere gli attributi "data-*" dell'HTML.
    // articolo.dataset.titolo equivale ad attributo data-titolo="..." nell'HTML.
    articolo.dataset.titolo = nota.titolo;
    articolo.dataset.id = nota.id;

    // I dati che vengono dal server (titolo, anteprima) li faccio passare
    // attraverso htmlSicuro() per evitare XSS
    articolo.innerHTML =
      '<h3>' + htmlSicuro(nota.titolo) + '</h3>' +
      '<p class="anteprima">' + htmlSicuro(nota.anteprima || "(Nota vuota)") + '</p>' +
      '<div class="pie">' +
        '<span class="data">Modificata il ' + formattaData(nota.data_modifica) + '</span>' +
        '<span class="azioni-nota">' +
          '<button class="icona-azione" title="Apri"><span class="material-symbols-outlined">edit</span></button>' +
          '<button class="icona-azione" title="Esporta"><span class="material-symbols-outlined">download</span></button>' +
          '<button class="icona-azione elimina" title="Elimina"><span class="material-symbols-outlined">delete</span></button>' +
        '</span>' +
      '</div>';
    return articolo;
  }

  // "async" = scrive codice asincrono in stile sequenziale.
  // Dentro un async function si puo' usare "await" per aspettare il risultato di una Promise.
  async function caricaNote() {
    try {

      // fetch lancia una richiesta HTTP. Restituisce una Promise
      // credentials: "include" e' importante: dice al
      // browser di mandare i cookie di sessione anche per richieste cross-origin.
      // Senza, il server non saprebbe chi sta chiedendo le note e risponderebbe 401.
      const res = await fetch("/api/note", { credentials: "include" });

      // res.json() legge il corpo della risposta e lo interpreta come JSON.
      const data = await res.json();
      if (!data.success) return;

      // Svuoto la griglia pe non lasciare nulla della vecchia sessione
      griglia.innerHTML = "";

      data.note.forEach(function (n) {

        griglia.appendChild(creaCardNota(n));

      });

      // Aggiorno il contatore "n note"
      conteggio.textContent = data.note.length;

      statoVuoto.style.display = (data.note.length === 0) ? "block" : "none";

      applicaRicerca();
    } catch (err) {
      // Se fetch lancia un errore (es. server irraggiungibile),
      mostraToast("Impossibile caricare le note.", "errore"); // in basso.
    }
  }

  // legge il testo dalla casella di ricerca e nasconde
  // le card il cui titolo non lo contiene.
  function applicaRicerca() {

    const testo = ricerca.value.trim().toLowerCase();

    // querySelectorAll restituisce una NodeList con TUTTI gli elementi che corrispondono
    // al selettore
    const note = griglia.querySelectorAll(".nota-card");
    let visibili = 0;
    note.forEach(function (n) {
      const titolo = n.dataset.titolo.toLowerCase();

      // includes restituisce true se la stringa contiene la sottostringa.
      if (titolo.includes(testo)) { n.style.display = ""; visibili++; }
      else { n.style.display = "none"; }
    });

    nessunRisultato.style.display = (note.length > 0 && visibili === 0) ? "block" : "none";
  }

  // L'evento "input" scatta ogni volta che il contenuto dell'input cambia
  ricerca.addEventListener("input", applicaRicerca);

  // "event delegation": guardo dove e' avvenuto il click (event.target).
  toggleVista.addEventListener("click", function (event) {

    // .closest("button") finche' non trova
    // un <button>, oppure restituisce null cerca. lo uso perchè l'utente può
    // cliccare sull'icona dentro al bottone, non sul bottone stesso.
    const bottone = event.target.closest("button");

    if (!bottone) return; // click fuori da un bottone -> ignora

    // Rimuovo la classe "attivo" da tutti i bottoni e la metto solo su quello cliccato.
    toggleVista.querySelectorAll("button").forEach(b => b.classList.remove("attivo"));
    bottone.classList.add("attivo");

    if (bottone.dataset.vista === "lista") griglia.classList.add("vista-lista");
    else griglia.classList.remove("vista-lista");
  });

  // un solo listener gestisce i click su qualsiasi card.
  griglia.addEventListener("click", async function (event) {

    const card = event.target.closest(".nota-card");
    if (!card) return;


    const id = card.dataset.id;
    const titolo = card.dataset.titolo;

    // Verifico se il click e' avvenuto dentro un bottone d'azione (Apri/Esporta/Elimina).
    const bottone = event.target.closest("button");

    if (bottone) {

      // Caso 1: il bottone "Elimina" ha classe "elimina".
      if (bottone.classList.contains("elimina")) {

        if (!confirm('Eliminare la nota "' + titolo + '"?')) return;
        try {
          const res = await fetch("/api/note/" + id, { method: "DELETE", credentials: "include" });
          const data = await res.json();
          if (data.success) {

            // Tolgo la card dal DOM
            card.remove();

            // Aggiorno conteggio e stato vuoto, e ri-applico la ricerca attiva.
            const totale = griglia.querySelectorAll(".nota-card").length;
            conteggio.textContent = totale;
            statoVuoto.style.display = (totale === 0) ? "block" : "none";
            mostraToast("Nota eliminata.");
            applicaRicerca();
          } else {
            mostraToast("Errore durante l'eliminazione.", "errore");
          }
        } catch (err) {
          mostraToast("Errore di rete.", "errore");
        }
      } else if (bottone.title === "Esporta") {

        // window.location.href = "..." fa navigare il browser a quell'URL.
        window.location.href = "/api/note/" + id + "/export";
      } else if (bottone.title === "Apri") {

        // Vado all'editor passando l'id della nota nella query string.
        window.location.href = "editor.html?id=" + id;
      }
      return; 
    }

    // Se il click era sulla card ma non su un bottone, apro comunque l'editor
    window.location.href = "editor.html?id=" + id;
  });

  // Bottone "Nuova nota"
  document.getElementById("btn-nuova-nota").addEventListener("click", async function () {
    try {

      // POST senza body: il server creera' una nota con valori di default.
      const res = await fetch("/api/note", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        window.location.href = "editor.html?id=" + data.id;
      } else {
        mostraToast("Errore creazione nota.", "errore");
      }
    } catch (err) {
      mostraToast("Errore di rete.", "errore");
    }
  });

  // Bottone "Elimina account"
  document.getElementById("elimina-account").addEventListener("click", async function () {
    if (!confirm("Eliminare definitivamente il tuo account?\nVerranno cancellate anche tutte le tue note.\nL'operazione non e' reversibile.")) return;
    try {
      const res = await fetch("/api/utente", { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        mostraToast("Account eliminato.");

        // aspetta qualche secondo per tornare alla home
        setTimeout(function () { window.location.href = "/index.html"; }, 1500);
      } else {
        mostraToast("Errore durante l'eliminazione.", "errore");
      }
    } catch (err) {
      mostraToast("Errore di rete.", "errore");
    }
  });

  caricaNote();
});
