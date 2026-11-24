// comune.js
// Script condiviso da TUTTE le pagine: hamburger menu, logout, bacheca home,
// toast, escape HTML


// Aspettiamo che il DOM sia pronto prima di cercare gli elementi
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");

  // Se la pagina ha la navbar mobile, aggiungiamo apertura/chiusura
  if (hamburger && menu) {
    hamburger.addEventListener("click", function () {

      // classList.toggle aggiunge la classe se manca, la toglie se c'e'
      menu.classList.toggle("aperto");
    });
  }

  // Prova a caricare la bacheca (esce subito se non siamo sulla home)
  caricaBachecaHome();
});


// Listener globale: intercetta tutti i click su <a class="logout">
// Cosi' si evita di mettere onclick su ogni link di logout
document.addEventListener("click", function (event) {
  // .closest() risale i genitori fino a trovare il selettore
  const link = event.target.closest("a.logout");
  if (!link) return;

  event.preventDefault();

  // credentials: "include" manda il cookie di sessione
  fetch("/api/logout", { method: "POST", credentials: "include" })

    // .finally() viene chiamato sia in caso di successo che di errore
    .finally(function () {
      window.location.href = "/index.html";
    });
});


// Chiede al server qual'è l'utente loggato
async function caricaUtenteCorrente() {
  try {
    const res = await fetch("/api/userinfo", { credentials: "include" });
    // res.ok e' true se lo status HTTP e' 200-299
    if (!res.ok) return null;
    const data = await res.json();
    return (data && data.success) ? data : null;
  } catch (err) {
    // Errore di rete -> utente non identificato
    return null;
  }
}


// Mostra/nasconde il link "Gestione" in base al ruolo dell'utente.
// solo gli amministratori devono vederlo.
function aggiornaNavigazionePerRuolo(utente) {
  const eAdmin = utente && utente.ruolo === "amministratore";

  // '$=' nel selettore = attributo che termina assolutamente con quel valore
  document.querySelectorAll('nav a[href$="gestione.html"]').forEach(function (a) {

    // .closest("li") risale al contenitore per nascondere tutta la voce
    const li = a.closest("li");
    (li || a).style.display = eAdmin ? "" : "none";
  });
}





function mostraToast(testo, tipo) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(testo); return; }

  toast.textContent = testo;

  toast.className = "toast visibile" + (tipo === "errore" ? " errore" : "");

  // Dopo 3 secondi togliamo "visibile" cosi il CSS lo fa sparire
  setTimeout(function () { toast.classList.remove("visibile"); }, 3000);
}


// Escape HTML: trasforma caratteri speciali (es. < diventa &lt;)
// per evitare XSS quando usiamo innerHTML con dati utente
function htmlSicuro(s) {
  // Trucco: creiamo un div, ci mettiamo il testo, e leggiamo innerHTML
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}


// Carica i post-it della bacheca per la homepage.
async function caricaBachecaHome() {
  const bacheca = document.querySelector(".bacheca:not(#bacheca)");
  if (!bacheca) return;

  try {
    const res = await fetch("/api/bacheca");
    const data = await res.json();
    if (!data.success) return;

    bacheca.innerHTML = "";

    data.bacheca.forEach(function (p) {
      const articolo = document.createElement("article");

      articolo.className = "post-it post-it-" + p.colore;

      articolo.innerHTML = "<h3>" + htmlSicuro(p.titolo) + "</h3><p>" + htmlSicuro(p.testo) + "</p>";
      bacheca.appendChild(articolo);
    });
  } catch (err) {
    // Errore di rete:  la bacheca resta vuota, falliamo in silenzio
  }
}
