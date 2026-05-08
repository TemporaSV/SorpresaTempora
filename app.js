import { appConfig } from "./config.js";
import {
  disableForm,
  formatWhatsAppDisplay,
  formatDateOnly,
  formatDateTime,
  getCampaignSettings,
  getSecretCodeFromUrl,
  humanizeSupabaseError,
  isRegistrationClosed,
  isSupabaseConfigured,
  isValidParticipantIdentifier,
  isValidWhatsApp,
  loadCampaignSettings,
  normalizeParticipantIdentifier,
  normalizeWhatsApp,
  registrationDeadline,
  redemptionDeadline,
  setStatus,
  supabase,
} from "./supabase-client.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const state = {
  detectedCode: getSecretCodeFromUrl(),
  validatedCode: "",
  claim: null,
  modalTrigger: null,
};

const elements = {
  introOverlay: document.querySelector("#intro-overlay"),
  dismissIntroButton: document.querySelector("#dismiss-intro-button"),
  registrationDeadlinePill: document.querySelector("#registration-deadline-pill"),
  redemptionDeadlinePill: document.querySelector("#redemption-deadline-pill"),
  closedBanner: document.querySelector("#registration-closed-banner"),
  closedTitle: document.querySelector("#registration-closed-title"),
  closedCopy: document.querySelector("#registration-closed-copy"),
  codePill: document.querySelector("#code-pill"),
  codeStatus: document.querySelector("#code-status"),
  detectedCodeWrap: document.querySelector("#detected-code"),
  detectedCodeValue: document.querySelector("#detected-code-value"),
  detailsPanel: document.querySelector("#details-panel"),
  detailsPill: document.querySelector("#details-pill"),
  detailsCodeChip: document.querySelector("#details-code-chip"),
  detailsCodeValue: document.querySelector("#details-code-value"),
  claimForm: document.querySelector("#claim-form"),
  firstName: document.querySelector("#first-name"),
  lastName: document.querySelector("#last-name"),
  participantIdentifier: document.querySelector("#participant-identifier"),
  participantIdentifierLabel: document.querySelector("#participant-identifier-label"),
  whatsapp: document.querySelector("#whatsapp"),
  whatsappLabel: document.querySelector("#whatsapp-label"),
  email: document.querySelector("#email"),
  termsCheckbox: document.querySelector("#terms-checkbox"),
  viewTermsButton: document.querySelector("#view-terms-button"),
  claimSubmit: document.querySelector("#claim-submit"),
  claimStatus: document.querySelector("#claim-status"),
  registeredPanel: document.querySelector("#registered-panel"),
  claimSummary: document.querySelector("#claim-summary"),
  termsShell: document.querySelector("#terms-shell"),
  termsList: document.querySelector("#terms-list"),
  termsPersonalData: document.querySelector("#terms-personal-data"),
  termsModal: document.querySelector("#terms-modal"),
  termsModalList: document.querySelector("#terms-modal-list"),
  closeTermsModalButton: document.querySelector("#close-terms-modal-button"),
  printTermsButton: document.querySelector("#print-terms-button"),
  emailNotificationStatus: document.querySelector("#email-notification-status"),
  restartFlowButton: document.querySelector("#restart-flow-button"),
  introKickerText: document.querySelector("#intro-kicker-text"),
  introTitleText: document.querySelector("#intro-title-text"),
  introCopyText: document.querySelector("#intro-copy-text"),
  heroEyebrowText: document.querySelector("#hero-eyebrow-text"),
  heroTitlePrefix: document.querySelector("#hero-title-prefix"),
  heroTitleHighlight: document.querySelector("#hero-title-highlight"),
  heroBodyText: document.querySelector("#hero-body-text"),
  offerTitleText: document.querySelector("#offer-title-text"),
  claimSectionTitle: document.querySelector("#claim-section-title"),
  codeValidationTitle: document.querySelector("#code-validation-title"),
  formSectionTitle: document.querySelector("#form-section-title"),
  successTitle: document.querySelector("#success-title"),
  termsSectionTitle: document.querySelector("#terms-section-title"),
  termsOfferTitle: document.querySelector("#terms-offer-title"),
  termsModalIntro: document.querySelector("#terms-modal-intro"),
  footerNote: document.querySelector("#footer-note"),
};

function renderBrandAssets() {
  const settings = getCampaignSettings();

  document.title = `${settings.brandName} | Registro de beneficio`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", settings.metaDescription);

  document.querySelectorAll("[data-brand-name]").forEach((node) => {
    node.textContent = settings.brandName;
  });

  document.querySelectorAll("[data-brand-logo]").forEach((node) => {
    node.setAttribute("src", settings.brandLogoPath || appConfig.brand.logoPath);
    node.setAttribute("alt", settings.brandName);
  });
}

function renderTerms() {
  const settings = getCampaignSettings();
  const terms = [...settings.terms];

  elements.termsList.innerHTML = terms
    .map((item) => `<li>${item}</li>`)
    .join("");
}

function updateDeadlineUi() {
  const settings = getCampaignSettings();

  elements.registrationDeadlinePill.textContent =
    `Registro hasta ${formatDateOnly(registrationDeadline)}`;
  elements.redemptionDeadlinePill.textContent =
    `Canje valido hasta ${formatDateOnly(redemptionDeadline)}`;
  elements.closedTitle.textContent = settings.registrationClosedTitle;

  if (!isRegistrationClosed()) {
    elements.closedBanner.hidden = true;
    return;
  }

  elements.closedBanner.hidden = false;
  elements.closedCopy.textContent =
    `El periodo de registro cerro el ${formatDateOnly(registrationDeadline)}. Ya no se permiten nuevos reclamos.`;
}

function renderCampaignCopy() {
  const settings = getCampaignSettings();

  renderBrandAssets();

  elements.introKickerText.textContent = settings.introKicker;
  elements.introTitleText.textContent = settings.introTitle;
  elements.introCopyText.textContent = settings.introCopy;
  elements.heroEyebrowText.textContent = settings.heroEyebrow;
  elements.heroTitlePrefix.textContent = settings.heroTitlePrefix;
  elements.heroTitleHighlight.textContent = settings.heroTitleHighlight;
  elements.heroBodyText.textContent = settings.heroBody;
  elements.offerTitleText.textContent = settings.offerTitle;
  elements.claimSectionTitle.textContent = settings.registrationSectionTitle;
  elements.codeValidationTitle.textContent = settings.codeValidationTitle;
  elements.formSectionTitle.textContent = settings.formSectionTitle;
  elements.successTitle.textContent = settings.successTitle;
  elements.termsSectionTitle.textContent = settings.termsSectionTitle;
  elements.termsOfferTitle.textContent = settings.offerTitle;
  elements.termsModalIntro.textContent = settings.termsModalIntro;
  elements.footerNote.textContent = settings.footerNote;
  elements.participantIdentifierLabel.textContent = settings.participantIdentifierLabel;
  elements.participantIdentifier.placeholder = settings.participantIdentifierPlaceholder;
  elements.participantIdentifier.inputMode = settings.participantIdentifierInputMode;
  elements.whatsappLabel.textContent = settings.whatsappLabel;
  elements.whatsapp.placeholder = settings.whatsappPlaceholder;

  renderTerms();
}

function paintCodeState(kind, label) {
  elements.codePill.textContent = label;

  if (kind === "success") {
    elements.codePill.className = "panel-pill panel-pill-success";
    return;
  }

  if (kind === "warning") {
    elements.codePill.className = "panel-pill";
    return;
  }

  elements.codePill.className = "panel-pill panel-pill-muted";
}

function paintDetailsState(kind, label) {
  elements.detailsPill.textContent = label;

  if (kind === "success") {
    elements.detailsPill.className = "panel-pill panel-pill-success";
    return;
  }

  elements.detailsPill.className = "panel-pill panel-pill-muted";
}

function revealDetailsPanel(visible) {
  elements.detailsPanel.hidden = !visible;
  elements.claimForm.hidden = !visible;
  elements.detailsCodeChip.hidden = !visible;
}

function fillDetectedCode() {
  if (!state.detectedCode) {
    elements.detectedCodeWrap.hidden = true;
    return;
  }

  elements.detectedCodeValue.textContent = state.detectedCode;
  elements.detectedCodeWrap.hidden = false;
}

function renderClaimSummary(claim) {
  const settings = getCampaignSettings();
  const rows = [
    ["Participante", `${claim.first_name} ${claim.last_name}`],
    ["Correo", claim.email],
    [settings.whatsappLabel, formatWhatsAppDisplay(claim.whatsapp_phone)],
    [settings.participantIdentifierLabel, claim.participant_identifier],
    ["Codigo aplicado", claim.claimed_code],
    ["Registrado", formatDateTime(claim.created_at)],
    ["Canje valido hasta", formatDateOnly(redemptionDeadline)],
  ];

  elements.claimSummary.innerHTML = rows
    .map(
      ([label, value]) => `
        <div>
          <dt>${label}</dt>
          <dd>${value}</dd>
        </div>
      `,
    )
    .join("");

  elements.termsPersonalData.innerHTML = rows
    .slice(0, 6)
    .map(
      ([label, value]) => `
        <div>
          <p>${label}</p>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join("");
}

function syncTermsModalContent() {
  if (!elements.termsList || !elements.termsModalList) {
    return;
  }

  elements.termsModalList.innerHTML = elements.termsList.innerHTML;
}

function openTermsModal(trigger = null) {
  if (!elements.termsModal) {
    return;
  }

  state.modalTrigger = trigger || document.activeElement;
  elements.termsModal.hidden = false;
  elements.termsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  elements.closeTermsModalButton?.focus();
}

function closeTermsModal() {
  if (!elements.termsModal || elements.termsModal.hidden) {
    return;
  }

  elements.termsModal.hidden = true;
  elements.termsModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  state.modalTrigger?.focus?.();
  state.modalTrigger = null;
}

function showClaimSuccess(claim) {
  state.claim = claim;
  elements.registeredPanel.hidden = false;
  elements.termsShell.hidden = false;
  revealDetailsPanel(false);
  renderClaimSummary(claim);
  paintCodeState("success", "QR registrado");
}

function resetClaimView() {
  state.claim = null;
  state.validatedCode = "";
  elements.registeredPanel.hidden = true;
  elements.termsShell.hidden = true;
  revealDetailsPanel(false);
  elements.claimForm.reset();
  setStatus(elements.claimStatus, "", "");
  setStatus(elements.emailNotificationStatus, "", "");
  paintCodeState("warning", "Pendiente");
  paintDetailsState("info", "Esperando validacion");
  elements.claimSubmit.disabled = true;
  fillDetectedCode();
}

function updateSubmitState() {
  const closed = isRegistrationClosed();
  const ready =
    Boolean(state.validatedCode) &&
    !closed &&
    elements.firstName.value.trim().length > 0 &&
    elements.lastName.value.trim().length > 0 &&
    isValidParticipantIdentifier(elements.participantIdentifier.value) &&
    isValidWhatsApp(elements.whatsapp.value) &&
    emailPattern.test(elements.email.value.trim()) &&
    elements.termsCheckbox.checked;

  elements.claimSubmit.disabled = !ready;
}

async function notifyClaimByEmail(claimId, notificationDispatchKey) {
  if (!supabase || !appConfig.notificationFunctionName || !notificationDispatchKey) {
    return;
  }

  const { error } = await supabase.functions.invoke(appConfig.notificationFunctionName, {
    body: {
      claimId,
      notificationDispatchKey,
    },
  });

  if (error) {
    setStatus(
      elements.emailNotificationStatus,
      "Registro guardado. Falta dejar operativa la funcion de correo en Supabase para el envio automatico.",
      "warning",
    );
    return;
  }

  setStatus(
    elements.emailNotificationStatus,
    "Tambien te enviamos un correo con la confirmacion y la informacion del canje.",
    "success",
  );
}

function handleValidationResponse(result, code) {
  const closed = isRegistrationClosed();

  if (!result?.available) {
    state.validatedCode = "";
    revealDetailsPanel(false);
    paintDetailsState("info", "Esperando validacion");
    paintCodeState("warning", result?.reason === "already_used" ? "QR usado" : "No disponible");
    setStatus(
      elements.codeStatus,
      result?.message || "No fue posible validar este QR.",
      result?.reason === "already_used" ? "error" : "warning",
    );
    return;
  }

  state.validatedCode = code;
  elements.detailsCodeValue.textContent = code;
  paintCodeState("success", "QR valido");

  if (closed) {
    paintDetailsState("info", "Registro cerrado");
    setStatus(
      elements.codeStatus,
      "El QR existe, pero el periodo de registro ya cerro.",
      "warning",
    );
    return;
  }

  revealDetailsPanel(true);
  paintDetailsState("success", "Listo para datos");
  setStatus(elements.codeStatus, result.message || "QR valido. Ya puedes continuar.", "success");
}

async function validateCode(event) {
  event?.preventDefault?.();

  if (!isSupabaseConfigured || !supabase) {
    setStatus(
      elements.codeStatus,
      "Configura primero Supabase en config.js para activar la validacion real del QR.",
      "warning",
    );
    return;
  }

  const code = state.detectedCode;

  if (!code) {
    resetClaimView();
    paintCodeState("warning", "Sin QR");
    setStatus(
      elements.codeStatus,
      "Este acceso solo funciona desde un QR valido. Escanea el codigo nuevamente.",
      "warning",
    );
    return;
  }

  if (state.validatedCode && state.validatedCode !== code) {
    resetClaimView();
  }

  setStatus(elements.codeStatus, "Validando QR en la base...", "info");
  paintCodeState("warning", "Validando");

  const { data, error } = await supabase.rpc("validate_promo_code", {
    p_code: code,
  });

  if (error) {
    revealDetailsPanel(false);
    paintCodeState("warning", "Error");
    setStatus(elements.codeStatus, humanizeSupabaseError(error), "error");
    return;
  }

  handleValidationResponse(data, code);
  updateSubmitState();
}

async function submitClaim(event) {
  event.preventDefault();

  if (!supabase || !state.validatedCode) {
    setStatus(elements.claimStatus, "Primero debes abrir el enlace desde un QR valido.", "warning");
    return;
  }

  if (isRegistrationClosed()) {
    setStatus(elements.claimStatus, "El registro ya no esta disponible.", "warning");
    return;
  }

  const settings = getCampaignSettings();
  const firstName = elements.firstName.value.trim();
  const lastName = elements.lastName.value.trim();
  const email = elements.email.value.trim().toLowerCase();
  const participantIdentifier = elements.participantIdentifier.value.trim().toUpperCase();
  const normalizedParticipantIdentifier = normalizeParticipantIdentifier(
    elements.participantIdentifier.value,
  );
  const whatsapp = normalizeWhatsApp(elements.whatsapp.value);

  elements.participantIdentifier.value = normalizedParticipantIdentifier;
  elements.whatsapp.value = whatsapp;

  if (!emailPattern.test(email)) {
    setStatus(elements.claimStatus, "Ingresa un correo electronico valido.", "warning");
    return;
  }

  if (!isValidParticipantIdentifier(participantIdentifier)) {
    setStatus(
      elements.claimStatus,
      `${settings.participantIdentifierLabel} no cumple con el formato esperado.`,
      "warning",
    );
    return;
  }

  if (!isValidWhatsApp(whatsapp)) {
    setStatus(
      elements.claimStatus,
      `El numero de ${settings.whatsappLabel} no cumple con el formato esperado.`,
      "warning",
    );
    return;
  }

  if (!elements.termsCheckbox.checked) {
    setStatus(elements.claimStatus, "Debes aceptar los terminos y condiciones.", "warning");
    return;
  }

  elements.claimSubmit.disabled = true;
  setStatus(elements.claimStatus, "Guardando tu registro...", "info");

  const { data, error } = await supabase.rpc("claim_promotion", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_participant_identifier: participantIdentifier,
    p_whatsapp_phone: whatsapp,
    p_email: email,
    p_code: state.validatedCode,
  });

  if (error) {
    elements.claimSubmit.disabled = false;

    if (`${error.message || ""}`.toUpperCase().includes("CODE_ALREADY_USED")) {
      state.validatedCode = "";
      revealDetailsPanel(false);
      paintCodeState("warning", "QR usado");
      paintDetailsState("info", "Esperando validacion");
      setStatus(elements.codeStatus, "Este QR ya fue registrado anteriormente.", "error");
    }

    setStatus(elements.claimStatus, humanizeSupabaseError(error), "error");
    return;
  }

  const claim = data?.claim;
  const notificationDispatchKey = data?.notification_dispatch_key;

  if (!claim) {
    elements.claimSubmit.disabled = false;
    setStatus(
      elements.claimStatus,
      "La respuesta del servidor no incluyo el registro esperado.",
      "error",
    );
    return;
  }

  showClaimSuccess(claim);
  setStatus(elements.claimStatus, "Registro completado con exito.", "success");
  await notifyClaimByEmail(claim.id, notificationDispatchKey);
  window.location.hash = "registered-panel";
}

function dismissIntro() {
  elements.introOverlay.classList.add("intro-overlay-hidden");
}

function handleGlobalKeydown(event) {
  if (event.key === "Escape") {
    closeTermsModal();
  }
}

function bindEvents() {
  elements.dismissIntroButton.addEventListener("click", dismissIntro);
  elements.claimForm.addEventListener("submit", submitClaim);
  elements.viewTermsButton.addEventListener("click", (event) => openTermsModal(event.currentTarget));
  elements.closeTermsModalButton.addEventListener("click", closeTermsModal);
  elements.termsModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeTermsModal === "true") {
      closeTermsModal();
    }
  });
  document.addEventListener("keydown", handleGlobalKeydown);
  elements.participantIdentifier.addEventListener("input", updateSubmitState);
  elements.whatsapp.addEventListener("input", () => {
    elements.whatsapp.value = normalizeWhatsApp(elements.whatsapp.value);
    updateSubmitState();
  });
  [elements.firstName, elements.lastName, elements.email, elements.termsCheckbox].forEach((node) => {
    node.addEventListener("input", updateSubmitState);
    node.addEventListener("change", updateSubmitState);
  });
  elements.printTermsButton.addEventListener("click", () => window.print());
  elements.restartFlowButton.addEventListener("click", () => {
    resetClaimView();
    window.location.hash = "claim-shell";
    validateCode();
  });
}

async function init() {
  try {
    await loadCampaignSettings();
  } catch (error) {
    setStatus(
      elements.codeStatus,
      "No fue posible cargar campaign_settings desde Supabase. Se usara config.js como respaldo.",
      "warning",
    );
    console.warn(error);
  }

  renderCampaignCopy();
  syncTermsModalContent();
  fillDetectedCode();
  updateDeadlineUi();
  bindEvents();
  resetClaimView();

  if (isRegistrationClosed()) {
    disableForm(elements.claimForm, true);
  }

  if (state.detectedCode) {
    window.setTimeout(() => {
      validateCode();
    }, 5200);
  }

  if (!isSupabaseConfigured || !supabase) {
    setStatus(
      elements.codeStatus,
      "Vista previa cargada. Completa config.js para activar la validacion y el guardado reales.",
      "warning",
    );
  }
}

init();
