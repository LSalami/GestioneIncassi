window.addEventListener("load", function () {
  const OTPContainer = document.querySelector("#otp-input");
  const OTPValueContainer = document.querySelector("#otp-value");
  const continueButton = document.querySelector("#submit");
  const errorModalElement = document.getElementById("error-modal");
  const errorModal = new bootstrap.Modal(errorModalElement);
  const inputs = Array.from(
    OTPContainer.querySelectorAll("input:not(#otp-value)")
  );

  const validCodes = {
    123456: "Mario Rossi",
    654321: "Luigi Bianchi",
    130990: "Luca Baron",
    151198: "Lorenzo Salami",
  };

  const login = () => {
    // Combina i valori degli input in un unico codice
    const enteredCode = inputs.map((input) => input.value || "*").join("");
    console.log("Codice OTP inserito:", enteredCode);

    // Simula una chiamata al server o una verifica del database
    fetch("/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: enteredCode }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Errore nella verifica del codice OTP.");
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          console.log("Login riuscito!");
          window.location.href = data.redirectUrl || "/dashboard";
        } else {
          console.error("Codice OTP non valido.");
          errorModal.show();
        }
      })
      .catch((error) => {
        console.error("Errore durante la verifica:", error);
        errorModal.show();
      });
  };

  const handleInput = (input, curIndex) => {
    input.value = input.value.replace(/\D/g, ""); // Permetti solo numeri
    input.value = input.value.slice(-1); // Assicurati che ci sia solo un carattere

    if (curIndex < inputs.length - 1 && input.value) {
      inputs[curIndex + 1].focus(); // Passa all'input successivo
    }
  };

  inputs.forEach((input, index) => {
    // Gestione dell'inserimento
    input.addEventListener("input", () => handleInput(input, index));

    // Gestione delle frecce destra/sinistra e altri tasti
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const allFilled = inputs.every((input) => input.value !== "");
        console.log(allFilled);
        allFilled ? login() : errorModal.show();
      } else if (e.key === "Backspace" && !input.value && index > 0) {
        const prevInput = inputs[index - 1];
        prevInput.focus();
        setTimeout(() => {
          prevInput.setSelectionRange(
            prevInput.value.length,
            prevInput.value.length
          );
        }, 0); // Posiziona il cursore alla fine
      } else if (e.key === "ArrowRight" && index < inputs.length - 1) {
        inputs[index + 1].focus();
      } else if (e.key === "ArrowLeft" && index > 0) {
        const prevInput = inputs[index - 1];
        prevInput.focus();
        setTimeout(() => {
          prevInput.setSelectionRange(
            prevInput.value.length,
            prevInput.value.length
          );
        }, 0); // Posiziona il cursore alla fine
      }
    });
  });

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
