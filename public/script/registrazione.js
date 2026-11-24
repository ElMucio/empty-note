// registrazione.js
// Validazione completa del form di registrazione, check disponibilita'
// e-mail/username in tempo reale, e invio al server con POST /api/registrazione.


document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("form-registrazione");

  // Le funzioni di validazione ritornano null se ok,
  // oppure una stringa con il messaggio di errore.

  // Valida nome o cognome
  function validaNomeCognome(valore, etichetta) {
    if (!valore) return "Inserisci il tuo " + etichetta + ".";
    if (valore.length < 2) return "Il " + etichetta + " e' troppo corto.";

    // Regex: lettere ASCII, accentate (À-ÿ), apostrofo, spazio e trattino
    if (!/^[a-zA-ZÀ-ÿ' -]+$/.test(valore))
      return "Il " + etichetta + " contiene caratteri non validi.";

    return null;
  }

  // Validazione e-mail con controlli incrementali
  function validaEmail(email) {
    if (!email) return "Inserisci la tua e-mail.";
    if (!email.includes("@")) return "L'e-mail deve contenere il carattere @.";
    if (!email.includes(".")) return "L'e-mail deve contenere un dominio (es: .it, .com).";

    // Regex per il formato canonico: primaparte@dominio.estensione
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return "Formato e-mail non valido (esempio: nome@dominio.it).";

    return null;
  }

  // Username: 3-30 caratteri, solo lettere/numeri/underscore
  function validaUsername(u) {
    if (!u) return "Scegli uno username.";
    if (u.length < 3) return "Lo username deve avere almeno 3 caratteri.";
    if (u.length > 30) return "Lo username e' troppo lungo (max 30 caratteri).";

    if (!/^[a-zA-Z0-9_]+$/.test(u))
      return "Lo username puo' contenere solo lettere, numeri e underscore.";

    return null;
  }

  // Password: minimo 6 caratteri
  function validaPassword(p) {
    if (!p) return "Inserisci una password.";
    if (p.length < 6) return "La password deve avere almeno 6 caratteri.";
    return null;
  }

  // Valida la data di nascita: non nel futuro, eta' tra 13 e 120 anni
  function validaData(d) {
    if (!d) return "Inserisci la tua data di nascita.";

    const data = new Date(d);
    const oggi = new Date();

    if (data > oggi) return "La data di nascita non puo' essere nel futuro.";

    // Calcoliamo l'eta' in anni (365.25 tiene conto dei bisestili)
    const eta = (oggi - data) / (1000 * 60 * 60 * 24 * 365.25);
    if (eta < 13) return "Devi avere almeno 13 anni per registrarti.";
    if (eta > 120) return "Data di nascita non valida.";

    return null;
  }

  // Helper grafico: mostra/nasconde lo stato di errore di un campo.
  function segnala(id, inErrore, messaggio) {
    const campo = document.getElementById(id);
    const elErrore = document.getElementById("err-" + id);

    if (inErrore) {
      if (messaggio) elErrore.textContent = messaggio;
      campo.classList.add("non-valido");
      elErrore.classList.add("visibile");
    } else {
      campo.classList.remove("non-valido");
      elErrore.classList.remove("visibile");
    }
  }

  // Chiede al server se un'email/username e' gia' in uso.
  async function disponibile(campo, valore) {
    try {

      // encodeURIComponent filtra i caratteri speciali per l'URL
      const res = await fetch("/api/check-availability?campo=" +
        encodeURIComponent(campo) + "&valore=" + encodeURIComponent(valore));
      const data = await res.json();
      return (data && data.success) ? data.disponibile : true;
    } catch (err) {
      // fallback permissivo, il server controllera' alla INSERT
      return true;
    }
  }

  // "blur" scatta quando il campo perde il focus: momento giusto per
  // controllare formato e disponibilita'
  document.getElementById("email").addEventListener("blur", async function () {
    const v = this.value.trim();

    if (v === "") { segnala("email", false); return; }

    const erroreFormato = validaEmail(v);
    if (erroreFormato) { segnala("email", true, erroreFormato); return; }

    // Solo se il formato e' ok chiediamo al server se e' libera
    const ok = await disponibile("email", v);
    if (!ok) segnala("email", true, "Questa e-mail e' gia' associata a un account.");
    else segnala("email", false);
  });

  document.getElementById("username").addEventListener("blur", async function () {
    const v = this.value.trim();
    if (v === "") { segnala("username", false); return; }

    const erroreFormato = validaUsername(v);
    if (erroreFormato) { segnala("username", true, erroreFormato); return; }

    const ok = await disponibile("username", v);
    if (!ok) segnala("username", true, "Questo username e' gia' in uso.");
    else segnala("username", false);
  });

  // Submit del form
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nome        = document.getElementById("nome").value.trim();
    const cognome     = document.getElementById("cognome").value.trim();
    const genere      = document.getElementById("genere").value;
    const dataNascita = document.getElementById("data_nascita").value;
    const email       = document.getElementById("email").value.trim();
    const username    = document.getElementById("username").value.trim();
    const password    = document.getElementById("password").value;
    const ripeti      = document.getElementById("ripeti_password").value;

    // si abbassa a false se anche un solo campo e' invalido
    let valido = true;

    function check(id, errore) {
      if (errore) { segnala(id, true, errore); valido = false; }
      else segnala(id, false);
    }

    check("nome",         validaNomeCognome(nome, "nome"));
    check("cognome",      validaNomeCognome(cognome, "cognome"));
    check("genere",       genere ? null : "Seleziona un'opzione.");
    check("data_nascita", validaData(dataNascita));
    check("email",        validaEmail(email));
    check("username",     validaUsername(username));
    check("password",     validaPassword(password));

    // Conferma password
    if (!ripeti) check("ripeti_password", "Conferma la tua password.");
    else if (ripeti !== password) check("ripeti_password", "Le due password non coincidono.");
    else check("ripeti_password", null);

    if (!valido) {
      mostraToast("Controlla i campi evidenziati.", "errore");
      return;
    }

    // Promise.all fa partire entrambe le richieste in parallelo
    // e aspetta la piu' lenta
    const [emailOk, usernameOk] = await Promise.all([
      disponibile("email", email),
      disponibile("username", username)
    ]);
    if (!emailOk)    { segnala("email",    true, "Questa e-mail e' gia' associata a un account."); valido = false; }
    if (!usernameOk) { segnala("username", true, "Questo username e' gia' in uso.");                valido = false; }
    if (!valido) {
      mostraToast("E-mail o username gia' in uso.", "errore");
      return;
    }

    // POST con tutti i campi in JSON
    try {
      const res = await fetch("/api/registrazione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nome, cognome, genere,
          data_nascita: dataNascita,
          email, username, password
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        mostraToast("Registrazione completata! Ora puoi accedere.");

        setTimeout(() => { window.location.href = "/login.html"; }, 1500);
      } else if (res.status === 409) {
        // 409 Conflict = e-mail o username gia' in uso
        mostraToast(data.message || "E-mail o username gia' in uso.", "errore");
        segnala("email",    true, "E-mail o username gia' in uso.");
        segnala("username", true, "E-mail o username gia' in uso.");
      } else {
        mostraToast(data.message || "Errore durante la registrazione.", "errore");
      }
    } catch (err) {
      mostraToast("Impossibile contattare il server. Riprova.", "errore");
    }
  });
});
