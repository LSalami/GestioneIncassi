// Configurazioni Globali
const tipoIncassoMap = { entrate: "Entrate", uscite: "Uscite" };
const tipoPagamentoMap = { contanti: "Contanti", pos: "POS" };
const tipoDocumentoMap = { fattura: "Fattura", scontrino: "Scontrino" };
const tipoIncassoMapInverse = { Entrate: "entrate", Uscite: "uscite" };
const tipoPagamentoMapInverse = { Contanti: "contanti", POS: "pos" };
const tipoDocumentoMapInverse = {
  Fattura: "fattura",
  Scontrino: "scontrino",
};

// =============================
// Inizializzazione della Pagina
// =============================
document.addEventListener("DOMContentLoaded", function () {
  if (!getCookie("userId")) {
    window.location.href = "/login.html";
  }

  // Aggiorna l'interfaccia utente con il nome
  document.getElementById(
    "user-name"
  ).textContent = `Utente registrato: ${getCookie("userName")}`;

  // Mostra il totale cassa solo per gli utenti con potere 1
  if (parseInt(getCookie("userPower"), 10) === 1) {
    document
      .getElementById("totale-cassa-container")
      .classList.remove("d-none");
    document.getElementById("search-box").classList.remove("d-none"); // Mostra il tasto cerca
  }

  // Logout
  document.getElementById("logout-icon").addEventListener("click", function () {
    logout();
  });

  document.querySelector(".search-box").addEventListener("click", () => {
    const modalElement = new bootstrap.Modal(
      document.getElementById("search-modal")
    );
    modalElement.show();
  });

  document
    .querySelector("#search-form")
    .addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Evita il comportamento predefinito del tasto Enter
        avviaRicerca(); // Chiama la funzione per avviare la ricerca
      }
    });

  document.querySelector("#execute-search").addEventListener("click", () => {
    avviaRicerca();
  });

  // Inizializza i due selettori di data per la ricerca
  flatpickr("#search-date-from", {
    altInput: true, // Mostra il formato alternativo all'utente
    altFormat: "l, d M Y", // Formato: Giovedì, 20 Feb 2025
    dateFormat: "Y-m-d", // Formato usato internamente (utile per inviare al backend)
    locale: "it",
  });

  flatpickr("#search-date-to", {
    altInput: true,
    altFormat: "l, d M Y",
    dateFormat: "Y-m-d",
    locale: "it",
  });

  const tipoIncassoRadios = document.getElementsByName("tipo-incasso");
  const tipoPagamentoRadios = document.getElementsByName("tipo-pagamento");

  tipoIncassoRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      // Se "Uscite" è selezionato e "POS" è selezionato, cambia automaticamente a "Contanti"
      if (
        document.getElementById("radio-uscite").checked &&
        document.getElementById("radio-pos").checked
      ) {
        document.getElementById("radio-contanti").checked = true;
      }
    });
  });

  tipoPagamentoRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      // Se "Uscite" è selezionato e "POS" è selezionato, cambia automaticamente a "Entrate"
      if (
        document.getElementById("radio-uscite").checked &&
        document.getElementById("radio-pos").checked
      ) {
        document.getElementById("radio-entrate").checked = true;
      }
    });
  });

  const today = new Date();
  const formattedToday = today
    .toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");

  function formatDateToItalian(date) {
    const formattedDate = date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return formattedDate
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  document.getElementById("current-date").innerText =
    formatDateToItalian(today);

  flatpickr("#calendar", {
    altInput: true,
    altFormat: "l, j M Y",
    dateFormat: "Y-m-d",
    defaultDate: formattedToday,
    locale: "it",
    onChange: function (selectedDates, dateStr) {
      const selectedDate = selectedDates[0];
      if (selectedDate) {
        const formattedDate = formatDateToItalian(selectedDate);
        document.getElementById("current-date").innerText = formattedDate;
        toggleFormVisibility(dateStr);
        caricaIncassi(dateStr);
      }
    },
  });

  // Inizializza il gestore della sessione al caricamento della pagina
  setupSessionTimeoutHandler();
  toggleFormVisibility(formattedToday);
  caricaIncassi(formattedToday);

  const searchModal = document.getElementById("search-modal");
  if (searchModal) {
    searchModal.addEventListener("hidden.bs.modal", function () {
      resetSearchModalFields();
    });
  }
});

// =============================
// Funzioni di Validazione
// =============================

// Validazione dei radio button
function validateRadioButtons() {
  const requiredGroups = ["tipo-incasso", "tipo-pagamento", "tipo-documento"];
  return requiredGroups.some(
    (group) => !document.querySelector(`input[name="${group}"]:checked`)
  );
}

// Validazione dell'importo
function validateImporto(input, isEdit = false) {
  input.value = input.value
    .replace(/[^0-9.,]/g, "") // Solo numeri, punto e virgola
    .replace(/,/g, ".") // Converte la virgola in punto
    .replace(/(\..*?)\..*/g, "$1") // Rimuove ulteriori punti
    .replace(/^0+(?!\.|$)/, "") // Rimuove zeri iniziali
    .replace(/(\.\d{2}).*/, "$1"); // Limita a due decimali

  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) {
    if (isEdit) {
      input.classList.add("is-invalid"); // Classe di errore Bootstrap
      input.classList.remove("is-valid"); // Rimuove eventuale stato di successo
    } else {
      showFieldError(
        "importo",
        "importo-error",
        "Inserisci un importo valido e positivo."
      );
    }
  } else {
    if (isEdit) {
      input.classList.add("is-valid"); // Classe di successo Bootstrap
      input.classList.remove("is-invalid"); // Rimuove eventuale stato di errore
    } else {
      clearFieldError("importo", "importo-error");
    }
  }
}

// Mostra errore sul campo
function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);

  if (field && error) {
    field.classList.add("is-invalid");
    error.innerText = message;
    error.classList.remove("d-none");
  } else {
    console.error("Campo o errore non trovato.");
  }
}

// Pulisce l'errore dal campo
function clearFieldError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);

  if (field && error) {
    field.classList.remove("is-invalid");
    error.classList.add("d-none");
    error.innerText = "";
  }
}

// =============================
// Gestione del Form
// =============================

// Ottieni i dati del form
function getFormData() {
  return {
    importo: parseFloat(document.getElementById("importo").value) || 0,
    tipoIncasso: document.querySelector('input[name="tipo-incasso"]:checked')
      ?.value,
    tipoPagamento: document.querySelector(
      'input[name="tipo-pagamento"]:checked'
    )?.value,
    tipoDocumento: document.querySelector(
      'input[name="tipo-documento"]:checked'
    )?.value,
    descrizione:
      document.getElementById("descrizione")?.value || "Non specificato",
  };
}

// Reset del form
function resetFormState(formId) {
  const form = document.getElementById(formId);

  if (!form) {
    console.error(`Il form con ID '${formId}' non esiste.`);
    return;
  }

  // Rimuove tutte le classi di validazione
  form.classList.remove("was-validated");

  // Ripristina gli stati iniziali di tutti i campi
  form.querySelectorAll(".form-control, .form-check-input").forEach((field) => {
    field.classList.remove("is-valid", "is-invalid");
  });

  // Nasconde tutti i messaggi di errore
  form
    .querySelectorAll(".invalid-feedback, .valid-feedback")
    .forEach((feedback) => {
      feedback.classList.add("d-none");
      feedback.innerText = ""; // Rimuove eventuali messaggi personalizzati
    });

  // Reset dei valori del modulo
  form.reset();
}

// Funzione che viene chiamata nel submit
(() => {
  "use strict";

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll(".needs-validation");

  // Loop over them and prevent submission
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (form.checkValidity() && !validateRadioButtons()) {
          event.preventDefault();
          event.stopPropagation();
          salvaIncasso();
        } else {
          event.preventDefault(); // Evita la ricarica della pagina
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

// =============================
// Operazioni con gli Incassi
// =============================

// Funzione per salvare l'incasso
function salvaIncasso() {
  const userId = parseInt(getCookie("userId"), 10);
  const userName = getCookie("userName");
  const formData = getFormData(); // Ottieni i dati dal form
  const currentTime = new Date().toLocaleTimeString("it-IT");
  const currentDate = new Date()
    .toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");

  formData.operatoreId = userId;
  formData.operatoreNome = userName;

  if (
    !formData.operatoreId ||
    formData.importo <= 0 ||
    validateRadioButtons()
  ) {
    console.error("Errore nei dati del form.");
    return;
  }
  const dataToSend = {
    ...formData,
    data: currentDate,
    ora: currentTime,
  };

  // Mostra un modal di conferma
  showConfirmModal(generateConfirmHTML(formData), () => {
    fetch("/api/incassi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          if (formData.tipoPagamento === "contanti") {
            if (formData.tipoIncasso === "entrate") {
              aggiornaTotaleCassa(formData.importo, "somma");
            } else if (formData.tipoIncasso === "uscite") {
              aggiornaTotaleCassa(formData.importo, "sottrazione");
            }
          }
          showSuccessMessage("Incasso salvato con successo!");
          caricaIncassi(currentDate); // Ricarica la tabella
          resetFormState("incasso-form"); // Resetta il form
        } else {
          console.error("Errore durante il salvataggio:", result.message);
        }
      })
      .catch((error) => {
        console.error("Errore durante la chiamata al server:", error);
      });
  });
}

// Genera HTML per il modal di conferma
function generateConfirmHTML(data) {
  return `
    <ul>
      <li><strong>Importo:</strong> € ${data.importo.toFixed(2)}</li>
      <li><strong>Tipo Incasso:</strong> ${
        tipoIncassoMap[data.tipoIncasso]
      }</li>
      <li><strong>Tipo Pagamento:</strong> ${
        tipoPagamentoMap[data.tipoPagamento]
      }</li>
      <li><strong>Tipo Documento:</strong> ${
        tipoDocumentoMap[data.tipoDocumento]
      }</li>
      <li><strong>Descrizione:</strong> ${data.descrizione}</li>
    </ul>`;
}

// Fuzione per aggiornare il totale cassa
function aggiornaTotaleCassa(importo, operazione) {
  if (importo === 0) return;
  fetch("/api/aggiorna-totale-cassa", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ importo, operazione }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {})
    .catch((error) =>
      console.error("Errore durante l'aggiornamento del totale cassa:", error)
    );
}

// Funzione per caricare gli incassi
function caricaIncassi(date) {
  fetch(`/api/incassi/${date}?timestamp=${new Date().getTime()}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        aggiornaTabellaIncassi(data.incassi);
        aggiungiEventiSelect(); // Aggiungi eventi dopo aver creato gli elementi
      }
    })
    .catch((error) => {
      console.error("Errore durante il caricamento degli incassi:", error);
    });
}

// Aggiorna la tabella degli incassi
function aggiornaTabellaIncassi(incassi) {
  const list = document.getElementById("incassi-list");
  list.innerHTML = "";

  fetch(`/api/totale-cassa?timestamp=${new Date().getTime()}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        let totaleCassa = data.totale;
        document.getElementById("totale-cassa").innerText = parseFloat(
          totaleCassa || 0
        ).toFixed(2);
      }
    })
    .catch((error) => {
      console.error("Errore durante il calcolo del totale:", error);
    });
  let totaleContanti = 0;
  let totalePOS = 0;

  const today = new Date().toLocaleDateString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  incassi.forEach((incasso, index) => {
    const userId = parseInt(getCookie("userId"), 10);
    const userPower = parseInt(getCookie("userPower"), 10) || 0;
    // Controlla se l'utente ha accesso a questa riga
    const isOwner = incasso.id_operatore === userId; // Verifica se l'utente ha creato l'incasso
    const isAdmin = userPower === 1;

    // Verifica il livello di potere dell'utente e filtra le righe
    if (userPower === 0 && incasso.livello_potere !== 0) {
      return; // Utente con potere 0 non può vedere righe con potere 1
    }

    const importo = parseFloat(incasso.importo);
    const importColor =
      incasso.tipo_incasso === "uscite" ? "text-danger" : "text-success";
    const incassoDate = new Date(incasso.data).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const isToday = incassoDate === today; // Verifica se l'incasso è di oggi

    if (incasso.tipo_incasso === "uscite") {
      if (incasso.tipo_pagamento === "contanti") {
        totaleContanti -= importo;
      } else if (incasso.tipo_pagamento === "pos") totalePOS -= importo;
    } else {
      if (incasso.tipo_pagamento === "contanti") {
        totaleContanti += importo;
      } else if (incasso.tipo_pagamento === "pos") totalePOS += importo;
    }

    const tipoIncassoFormatted =
      tipoIncassoMap[incasso.tipo_incasso] || incasso.tipo_incasso;
    const tipoPagamentoFormatted =
      tipoPagamentoMap[incasso.tipo_pagamento] || incasso.tipo_pagamento;
    const tipoDocumentoFormatted =
      tipoDocumentoMap[incasso.tipo_documento] || incasso.tipo_documento;

    const row = document.createElement("tr");
    row.setAttribute("data-id", incasso.id);
    row.innerHTML = `
      <tr data-id="${incasso.id}">

        <!-- Colonne in modalità view -->
        <td class="view ${importColor}">€ ${importo.toFixed(2)}</td>
        <td class="view">${tipoIncassoFormatted}</td>
        <td class="view">${tipoPagamentoFormatted}</td>
        <td class="view">${tipoDocumentoFormatted}</td>
        <td class="view">${incasso.descrizione}</td>

        <!-- Colonne in modalità edit -->
        <td class="edit">
          <div class="input-group input-group-sm">
            <div class="input-group-prepend">
              <span class="input-group-text text-sm" 
                id="basic-addon1" style="font-size: 0.8rem;">&euro;</span>
            </div>
            <input type="text" class="form-control form-control-sm"
              id="importo${incasso.id}"
              placeholder="Inserisci importo" required
              oninput="validateImporto(this, true)"
              value="${importo.toFixed(2)}" />
          </div>
        </td>

        <!-- Tipo Incasso - Menu a tendina  -->
        <td class="edit">
          <select
            id="tipoIncasso${incasso.id}"
            class="form-control form-control-sm">
            <option ${
              tipoIncassoFormatted === "Entrate" ? "selected" : ""
            }>Entrate</option>
            <option ${
              tipoIncassoFormatted === "Uscite" ? "selected" : ""
            }>Uscite</option>
          </select>
        </td>

        <!-- Tipo Pagamento - Menu a tendina  -->
        <td class="edit">
          <select
            id="tipoPagamento${incasso.id}"
            class="form-control form-control-sm">
            <option ${
              tipoPagamentoFormatted === "Contanti" ? "selected" : ""
            }>Contanti</option>
            <option ${
              tipoPagamentoFormatted === "POS" ? "selected" : ""
            }>POS</option>
          </select>
        </td>

        <!-- Tipo Documento - Menu a tendina -->
        <td class="edit">
          <select
            id="tipoDocumento${incasso.id}"
            class="form-control form-control-sm">
            <option ${
              tipoDocumentoFormatted === "Fattura" ? "selected" : ""
            }>Fattura</option>
            <option ${
              tipoDocumentoFormatted === "Scontrino" ? "selected" : ""
            }>Scontrino</option>
          </select>
        </td>
        
        <!-- Descrizione -->
        <td class="edit">
          <input type="text" class="form-control form-control-sm"
            id="descrizione${incasso.id}"
            placeholder="Inserire numero pratica"
            value="${incasso.descrizione}" />
        </td>

        <!-- Fissi non modificabili -->
        <td>${incasso.nome_utente || "Non specificato"}</td>
        <td>${incasso.ora}</td>

        <!-- Icone per Modifica e Elimina in modalità view -->
        <td class="text-end view">
          <div style="white-space: nowrap">
            ${
              isToday && (isOwner || isAdmin)
                ? `
            <i class="fas fa-edit text-warning me-2"
              onclick="modificaIncasso(${incasso.id})"
              style="cursor: pointer;"></i>
            <i class="fas fa-trash-alt text-danger"
              onclick="rimuoviIncasso(${incasso.id})"
              style="cursor: pointer;"></i>
            `
                : ""
            }
          </div>
        </td>

        <!-- Icone per Salvataggio e Annullamento in modalità edit -->
        <td class="text-end edit" style="display:none;">
          <i class="fas fa-save text-success me-2"
            onclick="salvaModifiche(${incasso.id})"
            style="cursor: pointer;"></i>
          <i class="fas fa-times text-danger"
            onclick="annullaModifiche(${incasso.id})"
            style="cursor: pointer;"></i>
        </td>
      </tr>
    `;

    list.appendChild(row);
  });

  document.getElementById("totale-contanti").innerText =
    totaleContanti.toFixed(2);
  document.getElementById("totale-pos").innerText = totalePOS.toFixed(2);
}

// Funzione per modificare gli incassi
function modificaIncasso(id) {
  // Trova la riga con l'attributo `data-id`
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) {
    console.error(`Riga con ID ${id} non trovata.`);
    return;
  }

  // Salva i valori originali
  row.dataset.originalImporto = document.getElementById(`importo${id}`).value;
  row.dataset.originalDescrizione = document.getElementById(
    `descrizione${id}`
  ).value;
  row.dataset.originalTipoIncasso = document.getElementById(
    `tipoIncasso${id}`
  ).value;
  row.dataset.originalTipoPagamento = document.getElementById(
    `tipoPagamento${id}`
  ).value;
  row.dataset.originalTipoDocumento = document.getElementById(
    `tipoDocumento${id}`
  ).value;

  // Nasconde le celle in modalità "view" e mostra quelle in modalità "edit"
  row
    .querySelectorAll(".view")
    .forEach((cell) => (cell.style.display = "none"));
  row
    .querySelectorAll(".edit")
    .forEach((cell) => (cell.style.display = "table-cell"));

  // Disabilita le altre righe
  const otherRows = document.querySelectorAll(
    `tr[data-id]:not([data-id="${id}"])`
  );
  otherRows.forEach((otherRow) => {
    otherRow.querySelectorAll(".fa-edit, .fa-trash-alt").forEach((icon) => {
      icon.style.pointerEvents = "none";
      icon.style.opacity = "0.5";
    });
  });

  // Disabilita il pulsante Salva per nuovi incassi
  const saveButton = document.querySelector(
    "#incasso-form button[type='submit']"
  );
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.style.pointerEvents = "none";
    saveButton.style.opacity = "0.5";
  }

  // Valida e aggiorna lo stato del textbox Importo
  const importoInput = document.getElementById(`importo${id}`);
  const saveIcon = row.querySelector(".fa-save");

  if (importoInput) {
    importoInput.addEventListener("input", () => {
      const value = parseFloat(importoInput.value);
      if (isNaN(value) || value <= 0) {
        importoInput.classList.add("is-invalid"); // Aggiunge lo stato di errore
        importoInput.classList.remove("is-valid"); // Rimuove lo stato valido
        saveIcon.style.pointerEvents = "none"; // Disabilita il clic sull'icona di salvataggio
        saveIcon.style.opacity = "0.5"; // Riduce la visibilità dell'icona
      } else {
        importoInput.classList.add("is-valid"); // Aggiunge lo stato valido
        importoInput.classList.remove("is-invalid"); // Rimuove lo stato di errore
        saveIcon.style.pointerEvents = "auto"; // Abilita il clic sull'icona di salvataggio
        saveIcon.style.opacity = "1"; // Ripristina la visibilità dell'icona
      }
    });

    // Trigger iniziale per gestire il caso in cui il valore sia già vuoto o 0
    importoInput.dispatchEvent(new Event("input"));
  }

  // Mostra l'icona di salvataggio e nasconde l'icona di modifica
  if (saveIcon) saveIcon.style.display = "inline-block";
  const editIcon = row.querySelector(".fa-edit");
  if (editIcon) editIcon.style.display = "none";
}

// Funzione per salvare le modifiche  degli incassi
function salvaModifiche(id) {
  const importoInput = document.getElementById(`importo${id}`);
  const descrizioneInput = document.getElementById(`descrizione${id}`);

  if (!importoInput || !descrizioneInput) {
    console.error(`Campi per l'incasso con ID ${id} non trovati.`);
    return;
  }

  const importo = parseFloat(importoInput.value);
  const descrizione = descrizioneInput.value;

  const tipoIncasso =
    tipoIncassoMapInverse[document.getElementById(`tipoIncasso${id}`).value] ||
    document.getElementById(`tipoIncasso${id}`).value;
  const tipoPagamento =
    tipoPagamentoMapInverse[
      document.getElementById(`tipoPagamento${id}`).value
    ] || document.getElementById(`tipoPagamento${id}`).value;
  const tipoDocumento =
    tipoDocumentoMapInverse[
      document.getElementById(`tipoDocumento${id}`).value
    ] || document.getElementById(`tipoDocumento${id}`).value;

  // Crea un oggetto con i dati aggiornati
  const dataToSend = {
    importo,
    tipoIncasso,
    tipoPagamento,
    tipoDocumento,
    descrizione,
    ora: new Date().toLocaleTimeString("it-IT"),
  };

  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) {
    console.error(`Riga con ID ${id} non trovata.`);
    return;
  }

  const importoOriginale = parseFloat(row.dataset.originalImporto);
  const tipoIncassoOriginale = row.dataset.originalTipoIncasso.toLowerCase();
  const tipoPagamentoOriginale =
    row.dataset.originalTipoPagamento.toLowerCase();

  // Invia i dati al server
  fetch(`/api/incassi/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dataToSend),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Errore durante la modifica dell'incasso");
      }
      return response.json();
    })
    .then((result) => {
      if (result.success) {
        if (tipoPagamentoOriginale === "contanti" && tipoPagamento === "pos") {
          if (tipoIncassoOriginale === "entrate") {
            aggiornaTotaleCassa(importoOriginale, "sottrazione");
          } else if (tipoIncassoOriginale === "uscite") {
            aggiornaTotaleCassa(importoOriginale, "somma");
          }
        } else if (
          tipoPagamentoOriginale === "pos" &&
          tipoPagamento === "contanti"
        ) {
          if (tipoIncasso === "entrate") {
            aggiornaTotaleCassa(importo, "somma");
          } else if (tipoIncasso === "uscite") {
            aggiornaTotaleCassa(importo, "sottrazione");
          }
        } else if (
          tipoPagamentoOriginale === "contanti" &&
          tipoPagamento === "contanti"
        ) {
          if (tipoIncassoOriginale !== tipoIncasso) {
            if (
              tipoIncassoOriginale === "entrate" &&
              tipoIncasso === "uscite"
            ) {
              aggiornaTotaleCassa(importoOriginale + importo, "sottrazione");
            } else if (
              tipoIncassoOriginale === "uscite" &&
              tipoIncasso === "entrate"
            ) {
              aggiornaTotaleCassa(importoOriginale + importo, "somma");
            }
          } else if (
            tipoIncassoOriginale === "entrate" &&
            tipoIncasso === "entrate"
          ) {
            const differenza = importo - importoOriginale;
            const differenzaAssoluta = Math.abs(differenza);
            aggiornaTotaleCassa(
              differenzaAssoluta,
              differenza > 0 ? "somma" : "sottrazione"
            );
          } else if (
            tipoIncassoOriginale === "uscite" &&
            tipoIncasso === "uscite"
          ) {
            const differenza = importo - importoOriginale;
            const differenzaAssoluta = Math.abs(differenza);
            aggiornaTotaleCassa(
              differenzaAssoluta,
              differenza > 0 ? "sottrazione" : "somma"
            );
          }
        }
        alert("Incasso modificato con successo");
        caricaIncassi(
          new Date()
            .toLocaleDateString("it-IT", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .split("/")
            .reverse()
            .join("-")
        );
      } else {
        console.error(result.message);
      }
    })
    .catch((error) => {
      alert("Impossibile completare l'operazione. Riprova più tardi.");
      console.error("Errore durante la chiamata API:", error);
    });

  // Rimuovi le restrizioni su altre righe
  const otherRows = document.querySelectorAll(`tr[data-id]`);
  otherRows.forEach((otherRow) => {
    otherRow.querySelectorAll(".fa-edit, .fa-trash-alt").forEach((icon) => {
      icon.style.pointerEvents = "auto";
      icon.style.opacity = "1";
    });
  });

  // Abilita il pulsante Salva per nuovi incassi
  const saveButton = document.querySelector(
    "#incasso-form button[type='submit']"
  );
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.style.pointerEvents = "auto";
    saveButton.style.opacity = "1";
  }
}

// Funzione per annullare le modifiche  degli incassi
function annullaModifiche(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) {
    console.error(`Riga con ID ${id} non trovata.`);
    return;
  }

  // Ripristina i valori originali delle select
  const tipoIncassoSelect = document.getElementById(`tipoIncasso${id}`);
  const tipoPagamentoSelect = document.getElementById(`tipoPagamento${id}`);
  const tipoDocumentoSelect = document.getElementById(`tipoDocumento${id}`);

  if (tipoIncassoSelect) {
    tipoIncassoSelect.value = row.dataset.originalTipoIncasso;
  }
  if (tipoPagamentoSelect) {
    tipoPagamentoSelect.value = row.dataset.originalTipoPagamento;
  }
  if (tipoDocumentoSelect) {
    tipoDocumentoSelect.value = row.dataset.originalTipoDocumento;
  }

  // Ripristina i valori originali di importo e descrizione
  const importoInput = document.getElementById(`importo${id}`);
  const descrizioneInput = document.getElementById(`descrizione${id}`);

  if (importoInput) {
    importoInput.value = row.dataset.originalImporto;
  }
  if (descrizioneInput) {
    descrizioneInput.value = row.dataset.originalDescrizione;
  }

  // Ripristina la modalità visualizzazione
  row
    .querySelectorAll(".view")
    .forEach((cell) => (cell.style.display = "table-cell"));
  row
    .querySelectorAll(".edit")
    .forEach((cell) => (cell.style.display = "none"));

  // Gestisci le icone
  const saveIcon = row.querySelector(".fa-save");
  const editIcon = row.querySelector(".fa-edit");

  if (saveIcon) saveIcon.style.display = "none";
  if (editIcon) editIcon.style.display = "inline-block";

  // Rimuovi le restrizioni su altre righe
  const otherRows = document.querySelectorAll(`tr[data-id]`);
  otherRows.forEach((otherRow) => {
    otherRow.querySelectorAll(".fa-edit, .fa-trash-alt").forEach((icon) => {
      icon.style.pointerEvents = "auto";
      icon.style.opacity = "1";
    });
  });

  // Abilita il pulsante Salva per nuovi incassi
  const saveButton = document.querySelector(
    "#incasso-form button[type='submit']"
  );
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.style.pointerEvents = "auto";
    saveButton.style.opacity = "1";
  }
}

// Funzione per rimuovere un incasso
function rimuoviIncasso(id) {
  if (!confirm("Sei sicuro di voler rimuovere questo incasso?")) {
    return; // Esci se l'utente annulla
  }
  // Trova la riga corrispondente all'incasso
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (!row) {
    console.error(`Incasso con ID ${id} non trovato.`);
    return null;
  }

  // Recupera i dettagli
  const importo = parseFloat(row.children[0].innerText.replace("€", "").trim());
  const tipoIncasso = row.children[1].innerText.trim();
  const tipoPagamento = row.children[2].innerText.trim();

  fetch(`/api/incassi/${id}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Errore durante la rimozione dell'incasso");
      }
      return response.json();
    })
    .then((result) => {
      if (result.success) {
        if (tipoPagamento === "Contanti") {
          if (tipoIncasso === "Entrate") {
            aggiornaTotaleCassa(importo, "sottrazione");
          } else if (tipoIncasso === "Uscite") {
            aggiornaTotaleCassa(importo, "somma");
          }
        }
        caricaIncassi(
          new Date()
            .toLocaleDateString("it-IT", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .split("/")
            .reverse()
            .join("-")
        );
      } else {
        console.error(result.message);
      }
    })
    .catch((error) => {
      console.error("Errore durante la chiamata API:", error);
    });
}

// =============================
// Funzioni di Utilità
// =============================

function createSessionTimer() {
  let sessionTimeout = null;
  let timeRemaining = getCookie("sessionTimeRemaining") || 300; // Tempo in secondi

  function startTimer() {
    clearInterval(sessionTimeout); // Evita duplicati
    sessionTimeout = setInterval(() => {
      timeRemaining -= 1; // Decrementa il tempo rimanente
      setCookie("sessionTimeRemaining", timeRemaining, timeRemaining); // Aggiorna il cookie

      if (timeRemaining <= 0) {
        clearInterval(sessionTimeout); // Ferma il timer
        logout(); // Esegui il logout
      }
    }, 1000); // Intervallo di 1 secondo (1000 millisecondi)
  }
  function resetTimer() {
    timeRemaining = 300; // Ripristina il tempo rimanente
    setCookie("sessionTimeRemaining", timeRemaining, timeRemaining); // Aggiorna il cookie
    startTimer(); // Riavvia il timer
  }

  return { startTimer, resetTimer };
}

// Crea un'istanza del timer
const sessionTimer = createSessionTimer();

// Avvia il timer
sessionTimer.startTimer();

// =============================
// Gestore del Timeout della Sessione
// =============================
function setupSessionTimeoutHandler() {
  const events = ["mousemove", "keydown", "click", "scroll"];
  events.forEach((event) => {
    window.addEventListener(event, () => sessionTimer.resetTimer()); // Usa il metodo di sessionTimer
  });

  // Avvia il timer all'avvio della pagina
  sessionTimer.startTimer();
}

function logout() {
  fetch("/logout", {
    method: "GET",
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Errore durante il logout lato server");
      }
      return response.json();
    })
    .then(() => {
      clearClientSession();
      window.location.href = "/login.html";
    })
    .catch((error) => {
      console.error("Errore durante il logout:", error);
      alert("Impossibile effettuare il logout. Riprova.");
    });
}

// Funzione per pulire i dati di sessione lato client
function clearClientSession() {
  deleteCookie("userId");
  deleteCookie("userName");
  deleteCookie("userPower");
  deleteCookie("sessionTimeRemaining");
}

// Mostra o nasconde il form di inserimento incassi
function toggleFormVisibility(selectedDate) {
  if (!selectedDate) {
    console.warn("Nessuna data selezionata.");
    return;
  }

  const form = document.getElementById("incasso-form");
  if (!form) {
    console.error("Il form con ID 'incasso-form' non esiste.");
    return;
  }

  const currentDate = new Date()
    .toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .split("/")
    .reverse()
    .join("-");

  form.classList.toggle("d-none", selectedDate !== currentDate);
}

// Mostra un messaggio di successo
function showSuccessMessage(message) {
  const responseContainer = document.querySelector(".response");
  responseContainer.innerHTML = `<div class="alert alert-success mt-3">${message}</div>`;
  setTimeout(() => (responseContainer.innerHTML = ""), 3000);
}

// Funzione per mostrare il modal di conferma
function showConfirmModal(contentHTML, onConfirm) {
  const modalElement = new bootstrap.Modal(
    document.getElementById("confirm-modal")
  );
  document.getElementById("modal-content").innerHTML = contentHTML;
  document.getElementById("confirm-button").onclick = () => {
    modalElement.hide();
    onConfirm();
  };
  document.getElementById("cancel-button").onclick = () => {
    modalElement.hide();
  };
  modalElement.show();
}

function aggiungiEventiSelect() {
  // Seleziona tutti i menu a tendina per tipo incasso e tipo pagamento
  const incassoSelects = document.querySelectorAll('[id^="tipoIncasso"]');
  const pagamentoSelects = document.querySelectorAll('[id^="tipoPagamento"]');

  incassoSelects.forEach((tipoIncassoSelect) => {
    const id = tipoIncassoSelect.id.replace("tipoIncasso", "");
    const tipoPagamentoSelect = document.getElementById(`tipoPagamento${id}`);

    if (tipoPagamentoSelect) {
      // Aggiungi evento "change" su tipoIncasso
      tipoIncassoSelect.addEventListener("change", () => {
        if (
          tipoIncassoSelect.value === "Uscite" &&
          tipoPagamentoSelect.value === "POS"
        ) {
          tipoPagamentoSelect.value = "Contanti";
        }
      });
      // Aggiungi evento "change" su tipoPagamento
      tipoPagamentoSelect.addEventListener("change", () => {
        if (
          tipoIncassoSelect.value === "Uscite" &&
          tipoPagamentoSelect.value === "POS"
        ) {
          tipoIncassoSelect.value = "Entrate";
        }
      });
    }
  });
}

function avviaRicerca() {
  const searchDateFrom = document
    .querySelector("#search-date-from")
    .value.trim();
  const searchDateTo = document.querySelector("#search-date-to").value.trim();
  const searchDescrizione = document
    .querySelector("#search-descrizione")
    .value.trim(); // Elimina spazi extra
  const searchTipoIncasso = document.querySelector(
    "#search-tipo-incasso"
  ).value;
  const searchTipoPagamento = document.querySelector(
    "#search-tipo-pagamento"
  ).value;

  const queryParams = new URLSearchParams({
    dataDa: searchDateFrom,
    dataA: searchDateTo,
    descrizione: searchDescrizione,
    tipoIncasso: searchTipoIncasso,
    tipoPagamento: searchTipoPagamento,
  });

  fetch(`/api/ricerca-incassi?${queryParams.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        visualizzaRisultatiRicerca(data.incassi);
      } else {
        console.error("Errore durante la ricerca:", data.message);
        document.querySelector("#search-results").innerHTML =
          '<p class="text-danger">Nessun risultato trovato.</p>';
      }
    })
    .catch((error) => {
      console.error("Errore durante la chiamata API:", error);
    });
}

function visualizzaRisultatiRicerca(incassi) {
  const resultsContainer = document.querySelector("#search-results");
  if (incassi.length === 0) {
    resultsContainer.innerHTML =
      '<p class="text-danger">Nessun risultato trovato.</p>';
    return;
  }

  let html = `
    <table class="table table-striped">
        <thead>
            <tr>
                <th>Data</th>
                <th>Importo (€)</th>
                <th>Tipo</th>
                <th>Pagamento</th>
                <th>Descrizione</th>
            </tr>
        </thead>
    <tbody>
  `;

  incassi.forEach((incasso) => {
    html += `
      <tr>
          <td>${new Date(incasso.data).toLocaleDateString("it-IT")}</td>
          <td>€ ${parseFloat(incasso.importo).toFixed(2)}</td>
          <td>${
            tipoIncassoMap[incasso.tipo_incasso] || incasso.tipo_incasso
          }</td>
          <td>${
            tipoPagamentoMap[incasso.tipo_pagamento] || incasso.tipo_pagamento
          }</td>
          <td>${incasso.descrizione}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  resultsContainer.innerHTML = html;
}

// Funzione per resettare i campi del modal di ricerca
function resetSearchModalFields() {
  const searchModal = document.getElementById("search-modal");
  if (!searchModal) return;

  // Seleziona tutti gli input e textarea e resetta i valori
  const inputs = searchModal.querySelectorAll("input, textarea, select");
  inputs.forEach((input) => {
    if (input.type === "checkbox" || input.type === "radio") {
      input.checked = false;
    } else {
      input.value = ""; // Svuota il campo
    }

    // Reset per i campi gestiti da Flatpickr
    if (input._flatpickr) {
      input._flatpickr.clear(); // Pulisce il campo
    }
  });

  // Pulisce i risultati di ricerca se presenti
  const searchResults = searchModal.querySelector("#search-results");
  if (searchResults) {
    searchResults.innerHTML = "";
  }
}

// =============================
// Funzioni di Gestione Cookies
// =============================

function setCookie(name, value, seconds) {
  const date = new Date();
  date.setTime(date.getTime() + seconds * 1000);
  const expires = `expires=${date.toUTCString()}`;
  const sameSite = "SameSite=Lax";
  const secure = location.protocol === "https:" ? "Secure" : "";
  document.cookie = `${name}=${value};${expires};${sameSite};${secure};path=/`;
}

function getCookie(name) {
  const cookieArr = document.cookie.split(";");
  for (let i = 0; i < cookieArr.length; i++) {
    const cookie = cookieArr[i].trim();
    if (cookie.indexOf(name + "=") === 0) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}
