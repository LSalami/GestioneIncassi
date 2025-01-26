window.addEventListener("load", function () {
  const loginContainer = document.querySelector("#login-input");
  const continueButton = document.querySelector("#submit");
  const errorModalElement = document.getElementById("error-modal");
  const errorModal = new bootstrap.Modal(errorModalElement);
  const inputs = Array.from(loginContainer.querySelectorAll("input"));

  // Funzione per resettare gli input
  const resetInputs = () => {
    inputs.forEach((input) => {
      input.value = ""; // Resetta i valori degli input
    });
    inputs[0].focus(); // Riporta il focus al primo input
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
          // Aggiorna i cookie con i dettagli dell'utente
          const { userId, userName, userPower } = data.user;
          setCookie("userId", userId, 3600); // Cookie valido per 1 ora
          setCookie("userName", userName, 3600);
          setCookie("userPower", userPower, 3600);

          // Reindirizza alla dashboard
          window.location.href = data.redirect || "/dashboard.html"; // Reindirizza alla dashboard
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

function setCookie(name, value, seconds) {
  const date = new Date();
  date.setTime(date.getTime() + seconds * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
}

function getCookie(name) {
  const cookieArr = document.cookie.split("; ");
  for (const cookie of cookieArr) {
    const [key, val] = cookie.split("=");
    if (key === name) {
      return val;
    }
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}
