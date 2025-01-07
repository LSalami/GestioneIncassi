window.addEventListener("load", function () {
  const loginContainer = document.querySelector("#login-input");
  const continueButton = document.querySelector("#submit");
  const errorModalElement = document.getElementById("error-modal");
  const errorModal = new bootstrap.Modal(errorModalElement);
  const userDisplay = document.getElementById("user-name");
  const inputs = Array.from(loginContainer.querySelectorAll("input"));

  // Funzione per resettare gli input
  const resetInputs = () => {
    inputs.forEach((input) => {
      input.value = ""; // Resetta i valori degli input
    });
    inputs[0].focus(); // Riporta il focus al primo input
  };

  // Funzione per aggiornare l'utente registrato
  const aggiornaUtenteRegistrato = (nomeUtente) => {
    if (userDisplay) {
      userDisplay.textContent = `Utente registrato: ${nomeUtente}`;
    }
  };

  // Funzione per gestire il login
  const login = () => {
    // Combina i valori degli input in un unico codice
    const enteredCode = inputs.map((input) => input.value || "*").join("");

    fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codice_accesso: enteredCode }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Errore nella verifica del codice di accesso.");
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          console.log("Login riuscito!");
          aggiornaUtenteRegistrato(data.nomeUtente); // Aggiorna il nome dell'utente registrato
          window.location.href = data.redirect || "/dashboard"; // Reindirizza alla dashboard
        } else {
          resetInputs(); // Cancella i valori degli input in caso di errore
          errorModal.show();
        }
      })
      .catch((error) => {
        console.error("Errore durante il login:", error);
        resetInputs(); // Cancella i valori degli input in caso di errore
        errorModal.show();
      });
  };

  // Funzione per gestire gli eventi di input
  const handleInput = (input, curIndex) => {
    input.addEventListener("keydown", (e) => {
      if (e.key >= "0" && e.key <= "9") {
        // Se viene digitato un numero, sovrascrivi il valore corrente
        e.preventDefault(); // Impedisce il comportamento predefinito
        input.value = e.key; // Sovrascrive il valore corrente

        // Sposta il focus alla prossima cella se esiste
        if (curIndex < inputs.length - 1) {
          inputs[curIndex + 1].focus();
        }
      } else if (e.key === "Enter") {
        const allFilled = inputs.every((input) => input.value !== "");
        if (allFilled) {
          login();
        } else {
          resetInputs();
          errorModal.show();
        }
      } else if (e.key === "Backspace") {
        // Cancella il valore e passa alla cella precedente
        e.preventDefault();
        input.value = "";
        if (curIndex > 0) {
          inputs[curIndex - 1].focus();
        }
      } else if (e.key === "ArrowLeft" && curIndex > 0) {
        // Sposta il focus alla cella precedente
        inputs[curIndex - 1].focus();
      } else if (e.key === "ArrowRight" && curIndex < inputs.length - 1) {
        // Sposta il focus alla cella successiva
        inputs[curIndex + 1].focus();
      } else if (e.key === "Delete") {
        input.value = "";
      } else {
        e.preventDefault(); // Impedisce l'input di altri caratteri
      }
    });
  };

  // Applica la gestione degli eventi agli input
  inputs.forEach((input, index) => {
    handleInput(input, index);
  });

  // Gestione del pulsante "Continua"
  continueButton.addEventListener("click", () => {
    const allFilled = inputs.every((input) => input.value !== "");
    allFilled ? login() : errorModal.show();
  });

  // Chiudi la modale con il tasto Enter
  errorModalElement.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      errorModal.hide();
    }
  });
  // Riporta il focus al primo input quando la modale si chiude
  errorModalElement.addEventListener("hidden.bs.modal", () => {
    inputs[0].focus();
  });

  //Focus sul primo input all'avvio
  inputs[0].focus();
});
