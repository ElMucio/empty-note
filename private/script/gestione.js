// gestione.js
// Pagina "gestione.html" riservata agli admin: gestisce la bacheca pubblica

document.addEventListener("DOMContentLoaded", function () {

  // Nasconde "Gestione" ai non admin
  caricaUtenteCorrente().then(aggiornaNavigazionePerRuolo);

  // Contenitore principale dei post-it.
  const bacheca = document.getElementById("bacheca");
  const colori = ["giallo", "rosa", "verde", "azzurro"];

  // Genera l'HTML dei 4 swatch (quadratini di scelta colore)
  function htmlSwatch() {
    // .join("") concatena in stringa.
    return '<div class="post-it-colori">' +
      colori.map(c =>
        '<button class="colore-swatch ' + c + '" data-colore="' + c + '" title="Colore ' + c + '"></button>'
      ).join("") +
      '</div>';
  }

  // Crea un elemento <article> che rappresenta un post-it.
  function creaPostIt(classeColore, titolo, testo) {
    const articolo = document.createElement("article");
    articolo.className = "post-it post-it-" + classeColore;

    // htmlSicuro() previene XSS sui valori che vengono dal server.
    articolo.innerHTML =
      htmlSwatch() +
      '<button class="post-it-elimina" title="Elimina nota">&times;</button>' +
      '<div class="post-it-titolo" contenteditable="true">' + htmlSicuro(titolo) + '</div>' +
      '<div class="post-it-testo" contenteditable="true">' + htmlSicuro(testo) + '</div>';
    return articolo;
  }

  // Carica la bacheca dal server (GET /api/bacheca, pubblica) e ricostruisce il DOM.
  async function caricaBacheca() {
    try {
      const res = await fetch("/api/bacheca");
      const data = await res.json();
      if (data.success) {
        bacheca.innerHTML = "";
        data.bacheca.forEach(p => {
          bacheca.appendChild(creaPostIt(p.colore, p.titolo, p.testo));
        });
      }
    } catch (err) {
      mostraToast("Impossibile caricare la bacheca.", "errore");
    }
  }

  document.getElementById("aggiungi").addEventListener("click", function () {
    const indice = bacheca.children.length;
    // % cicla sui 4 colori: 0,1,2,3,0,1,2,3...
    const colore = colori[indice % colori.length];
    const nuovo = creaPostIt(colore, "Nuovo titolo", "Scrivi qui il testo della nota...");
    bacheca.appendChild(nuovo);

    // scrollIntoView porta l'elemento in vista con scroll animato.
    nuovo.scrollIntoView({ behavior: "smooth", block: "center" });
    nuovo.querySelector(".post-it-titolo").focus();
  });

  bacheca.addEventListener("click", function (event) {

    const elim = event.target.closest(".post-it-elimina");
    if (elim) {
      if (confirm("Eliminare questa nota dalla bacheca?")) {
        elim.closest(".post-it").remove();
        mostraToast("Nota eliminata.");
      }
      return;
    }
    // cambio colore del post-it.
    const sw = event.target.closest(".colore-swatch");
    if (sw) {
      const p = sw.closest(".post-it");

      // Tolgo tutte le classi colore e metto quella nuova.
      p.classList.remove("post-it-giallo", "post-it-rosa", "post-it-verde", "post-it-azzurro");
      p.classList.add("post-it-" + sw.dataset.colore);
      return;
    }
  });

  // Raccoglie i post-it dal DOM e li manda al server con PUT.
  document.getElementById("salva").addEventListener("click", async function () {
    const lista = [];
    bacheca.querySelectorAll(".post-it").forEach(p => {

      const titolo = p.querySelector(".post-it-titolo").textContent.trim();
      const testo = p.querySelector(".post-it-testo").textContent.trim();
      // Cerco quale delle 4 classi post-it-<colore> e' presente.
      let colore = "giallo";
      colori.forEach(c => { if (p.classList.contains("post-it-" + c)) colore = c; });

      if (titolo || testo) lista.push({ titolo, testo, colore });
    });
    try {
      // PUT /api/bacheca protetta da richiediAdmin (403 per utenti normali).
      const res = await fetch("/api/bacheca", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: lista })
      });
      const data = await res.json();
      if (data.success) mostraToast("Bacheca salvata: " + data.totale + " note.");
      else mostraToast(data.message || "Errore nel salvataggio.", "errore");
    } catch (err) {
      mostraToast("Errore di rete.", "errore");
    }
  });

  // scarico la bacheca corrente dal server.
  caricaBacheca();
});
