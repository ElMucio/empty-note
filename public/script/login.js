// login.js
// Validazione e invio del form di login. In caso di successo
// reindirizza alla dashboard privata.


document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("form-login");

  // Helper grafico: mostra/nasconde lo stato di errore di un campo.
  // Per ogni input con id "X" esiste un <span id="err-X"> con il messaggio.
  function segnala(id, inErrore) {
    const campo = document.getElementById(id);
    const errore = document.getElementById("err-" + id);

    if (inErrore) {
      // "non-valido",CSS colora il bordo di rosso
      campo.classList.add("non-valido");
      errore.classList.add("visibile");
    } else {
      campo.classList.remove("non-valido");
      errore.classList.remove("visibile");
    }
  }


  form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const identificativo = document.getElementById("identificativo").value.trim();
    const password = document.getElementById("password").value;

    // Validazione minima: solo "non vuoto"
    let valido = true;

    if (identificativo === "") {
      segnala("identificativo", true);
      valido = false;
    } else {
      segnala("identificativo", false);
    }

    if (password === "") {
      segnala("password", true);
      valido = false;
    } else {
      segnala("password", false);
    }

    if (!valido) {
      mostraToast("Inserisci username/e-mail e password.", "errore");
      return;
    }

    // POST /api/login
    try {
      const res = await fetch("/api/login", {
        method: "POST",

        // Content-Type JSON cosi' express.json() popola req.body
        headers: { "Content-Type": "application/json" },

        // credentials: "include" per inviare/ricevere il cookie di sessione
        credentials: "include",

        body: JSON.stringify({ identificativo, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Login riuscito
        window.location.href = "/private/dashboard.html";
      } else if (res.status === 401) {
        // Non riveliamo se e' sbagliato username o password
        mostraToast("Credenziali non valide.", "errore");
        segnala("identificativo", true);
        segnala("password", true);
      } else {
        mostraToast(data.message || "Errore durante l'accesso.", "errore");
      }
    } catch (err) {
      // fetch fallisce a livello di rete
      mostraToast("Impossibile contattare il server. Riprova.", "errore");
    }
  });
});
