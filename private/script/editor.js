// editor.js
// Gestisce la pagina "editor.html": carica una nota, la formatta con la toolbar
// e permette di salvarla, scaricarla o eliminarla.

document.addEventListener("DOMContentLoaded", function () {

  // caricaUtenteCorrente -> aggiornaNavigazionePerRuolo: nasconde "Gestione"
  // ai non admin. Funzioni definite in comune.js.
  caricaUtenteCorrente().then(aggiornaNavigazionePerRuolo);

  // window.location.search = la query string dopo il "?".
  // URLSearchParams facilita la lettura dei parametri (es. params.get("id")).
  const params = new URLSearchParams(window.location.search);
  const idNota = params.get("id");
  if (!idNota) {
    // senza id non ha senso aprire l'editor, rimando alla dashboard
    window.location.href = "dashboard.html";
    return;
  }

  // Riferimenti agli elementi del DOM che uso piu' volte.
  const toolbar = document.getElementById("toolbar");
  const area = document.getElementById("area-scrittura");

  const colore = document.getElementById("colore");
  const inputTitolo = document.getElementById("titolo-nota");

  // L'area di scrittura e' un <div contenteditable="true">: rende l'elemento
  // modificabile come una textarea, ma mantiene l'HTML formattato (grassetto ecc.).

  // Carica il contenuto della nota dal server.
  async function caricaNota() {
    try {
      // GET /api/note/:id restituisce { success, titolo, contenuto }.
      const res = await fetch("/api/note/" + idNota, { credentials: "include" });
      if (res.status === 404) {
        mostraToast("Nota non trovata.", "errore");
        setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
        return;
      }
      const data = await res.json();
      if (data.success) {
        inputTitolo.value = data.titolo;
        // innerHTML perche' il contenuto puo' avere tag di formattazione
        area.innerHTML = data.contenuto || "";
      }
    } catch (err) {
      mostraToast("Errore di rete.", "errore");
    }
  }

  // querySelectorAll("button[data-comando]") prende tutti i bottoni con
  // l'attributo data-comando (grassetto, corsivo, ecc.).
  toolbar.querySelectorAll("button[data-comando]").forEach(function (b) {

    // mousedown + preventDefault: evita che il click tolga il focus dall'area
    // di scrittura e perda la selezione di testo.
    b.addEventListener("mousedown", e => e.preventDefault());
    b.addEventListener("click", function () {
      area.focus();

      // execCommand applica la formattazione alla selezione corrente nel
      // contenteditable.
      // Parametri: (comando, mostraUI=false, valore=null).
      document.execCommand(b.dataset.comando, false, null);
    });
  });

  // Cambio colore testo: l'evento "input" sul color picker scatta ad ogni modifica.
  colore.addEventListener("input", function () {
    area.focus();
    // foreColor accetta una stringa colore CSS (es. "#ff0000").
    document.execCommand("foreColor", false, colore.value);
  });

  document.getElementById("btn-salva").addEventListener("click", async function () {
    try {
      const res = await fetch("/api/note/" + idNota, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          titolo: inputTitolo.value.trim() || "Nota senza titolo",

          // innerHTML restituisce l'HTML formattato; il server lo cifra prima di salvarlo.
          contenuto: area.innerHTML
        })
      });
      const data = await res.json();
      if (data.success) mostraToast("Nota salvata.");
      else mostraToast("Errore nel salvataggio.", "errore");
    } catch (err) {
      mostraToast("Errore di rete.", "errore");
    }
  });

  document.getElementById("btn-scarica").addEventListener("click", function () {
    window.location.href = "/api/note/" + idNota + "/export";
  });

  document.getElementById("btn-elimina").addEventListener("click", async function () {
    if (!confirm("Eliminare definitivamente questa nota?")) return;
    try {
      const res = await fetch("/api/note/" + idNota, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        mostraToast("Nota eliminata.");

        setTimeout(() => { window.location.href = "dashboard.html"; }, 1200);
      } else {
        mostraToast("Errore nell'eliminazione.", "errore");
      }
    } catch (err) {
      mostraToast("Errore di rete.", "errore");
    }
  });

  // carico il contenuto della nota.
  caricaNota();
});
