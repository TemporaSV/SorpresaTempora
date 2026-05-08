import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { appConfig } from "./config.js";

const supabasePublicKey =
  appConfig.supabasePublishableKey || appConfig.supabaseAnonKey || "";

const looksConfigured =
  typeof appConfig.supabaseUrl === "string" &&
  typeof supabasePublicKey === "string" &&
  !appConfig.supabaseUrl.includes("TU_PROYECTO") &&
  !supabasePublicKey.includes("TU_SUPABASE");

export const isSupabaseConfigured = looksConfigured;

export const supabase = looksConfigured
  ? createClient(appConfig.supabaseUrl, supabasePublicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function buildDefaultCampaignSettings() {
  return {
    brandName: appConfig.brand?.name || "Tu Negocio",
    brandLogoPath: appConfig.brand?.logoPath || "./assets/brand-logo.svg",
    metaDescription:
      appConfig.brand?.metaDescription ||
      "Plantilla para una promocion con QR, registro unico y panel administrativo.",
    adminEmailPlaceholder: appConfig.brand?.adminEmailPlaceholder || "admin@tunegocio.com",
    locale: appConfig.campaign?.locale || "es-SV",
    timeZone: appConfig.campaign?.timeZone || "America/El_Salvador",
    registrationDeadlineIso:
      appConfig.campaign?.registrationDeadlineIso || "2026-05-16T23:59:59-06:00",
    redemptionDeadlineIso:
      appConfig.campaign?.redemptionDeadlineIso || "2026-05-31T23:59:59-06:00",
    introKicker: appConfig.campaign?.introKicker || "Promocion exclusiva",
    introTitle: appConfig.campaign?.introTitle || "Sorpresa",
    introCopy: appConfig.campaign?.introCopy || "Hay un beneficio reservado para ti.",
    heroEyebrow: appConfig.campaign?.heroEyebrow || "Beneficio activado por QR",
    heroTitlePrefix: appConfig.campaign?.heroTitlePrefix || "Sorpresa, te has ganado",
    heroTitleHighlight: appConfig.campaign?.heroTitleHighlight || "un beneficio exclusivo",
    heroBody:
      appConfig.campaign?.heroBody ||
      "Valida la clave de tu QR y completa tu registro para reservar el beneficio.",
    offerTitle: appConfig.campaign?.offerTitle || "Beneficio exclusivo",
    offerDescription:
      appConfig.campaign?.offerDescription || "Completa tu registro para reservarlo.",
    registrationSectionTitle:
      appConfig.campaign?.registrationSectionTitle ||
      "Vamos a revisar que tu codigo QR sea valido.",
    registrationClosedTitle:
      appConfig.campaign?.registrationClosedTitle ||
      "Proceso de registro para canjear beneficio.",
    codeValidationTitle: appConfig.campaign?.codeValidationTitle || "Valida tu QR",
    formSectionTitle: appConfig.campaign?.formSectionTitle || "Completa tus datos",
    successTitle: appConfig.campaign?.successTitle || "Tu beneficio ya quedo reservado.",
    termsSectionTitle:
      appConfig.campaign?.termsSectionTitle || "Condiciones oficiales de la promocion.",
    termsModalIntro:
      appConfig.campaign?.termsModalIntro ||
      "Revisa las condiciones antes de confirmar tu registro.",
    footerNote:
      appConfig.campaign?.footerNote || "Promocion vigente hasta la fecha de canje publicada.",
    redemptionInstructions: Array.isArray(appConfig.campaign?.redemptionInstructions)
      ? [...appConfig.campaign.redemptionInstructions]
      : [],
    terms: Array.isArray(appConfig.campaign?.terms) ? [...appConfig.campaign.terms] : [],
    participantIdentifierLabel: appConfig.participant?.identifierLabel || "Documento",
    participantIdentifierPlaceholder:
      appConfig.participant?.identifierPlaceholder || "ABC-123456",
    participantIdentifierPattern:
      appConfig.participant?.identifierPattern || "^[A-Z0-9-]{6,20}$",
    participantIdentifierNormalizationPattern:
      appConfig.participant?.identifierNormalizationPattern || "[^A-Z0-9]",
    participantIdentifierInputMode: appConfig.participant?.identifierInputMode || "text",
    whatsappLabel: appConfig.participant?.whatsappLabel || "WhatsApp",
    whatsappPlaceholder: appConfig.participant?.whatsappPlaceholder || "1234-5678",
    whatsappCountryCode: appConfig.participant?.whatsappCountryCode || "503",
    whatsappLocalPattern: appConfig.participant?.whatsappLocalPattern || "^[567][0-9]{7}$",
    whatsappFormatGroups: Array.isArray(appConfig.participant?.whatsappFormatGroups)
      ? [...appConfig.participant.whatsappFormatGroups]
      : [4, 4],
    adminTitle: appConfig.admin?.title || "Panel administrativo",
    adminSubtitle:
      appConfig.admin?.subtitle ||
      "Consulta participantes y registra el canje de la promocion.",
    adminSearchPlaceholder:
      appConfig.admin?.searchPlaceholder || "Ejemplo: 1234-5678 o PROMO-2026-001",
    emailSubject: appConfig.emailTemplate?.subject || "Tu registro fue confirmado",
    emailHeadline: appConfig.emailTemplate?.headline || "Tu registro fue confirmado",
    emailConfirmationMessage:
      appConfig.emailTemplate?.confirmationMessage ||
      "Hola {{first_name}}, tu beneficio ya quedo registrado.",
    emailInstructionsTitle:
      appConfig.emailTemplate?.instructionsTitle || "Indicaciones para canjear",
    emailTermsTitle: appConfig.emailTemplate?.termsTitle || "Terminos y condiciones",
  };
}

let campaignSettings = buildDefaultCampaignSettings();
let campaignSettingsRequest = null;
let campaignSettingsLoaded = false;

export let registrationDeadline = new Date(campaignSettings.registrationDeadlineIso);
export let redemptionDeadline = new Date(campaignSettings.redemptionDeadlineIso);

function syncDerivedSettings() {
  registrationDeadline = new Date(campaignSettings.registrationDeadlineIso);
  redemptionDeadline = new Date(campaignSettings.redemptionDeadlineIso);
}

function asStringArray(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function asNumberArray(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const numbers = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  return numbers.length ? numbers : [...fallback];
}

function coalesceString(value, fallback) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function applyRemoteCampaignSettings(row = {}) {
  const fallback = buildDefaultCampaignSettings();

  campaignSettings = {
    ...fallback,
    brandName: coalesceString(row.brand_name, fallback.brandName),
    metaDescription: coalesceString(row.meta_description, fallback.metaDescription),
    adminEmailPlaceholder: coalesceString(
      row.admin_email_placeholder,
      fallback.adminEmailPlaceholder,
    ),
    locale: coalesceString(row.locale, fallback.locale),
    timeZone: coalesceString(row.time_zone, fallback.timeZone),
    registrationDeadlineIso: coalesceString(
      row.registration_deadline_at,
      fallback.registrationDeadlineIso,
    ),
    redemptionDeadlineIso: coalesceString(
      row.redemption_deadline_at,
      fallback.redemptionDeadlineIso,
    ),
    introKicker: coalesceString(row.intro_kicker, fallback.introKicker),
    introTitle: coalesceString(row.intro_title, fallback.introTitle),
    introCopy: coalesceString(row.intro_copy, fallback.introCopy),
    heroEyebrow: coalesceString(row.hero_eyebrow, fallback.heroEyebrow),
    heroTitlePrefix: coalesceString(row.hero_title_prefix, fallback.heroTitlePrefix),
    heroTitleHighlight: coalesceString(row.hero_title_highlight, fallback.heroTitleHighlight),
    heroBody: coalesceString(row.hero_body, fallback.heroBody),
    offerTitle: coalesceString(row.offer_title, fallback.offerTitle),
    offerDescription: coalesceString(row.offer_description, fallback.offerDescription),
    registrationSectionTitle: coalesceString(
      row.registration_section_title,
      fallback.registrationSectionTitle,
    ),
    registrationClosedTitle: coalesceString(
      row.registration_closed_title,
      fallback.registrationClosedTitle,
    ),
    codeValidationTitle: coalesceString(row.code_validation_title, fallback.codeValidationTitle),
    formSectionTitle: coalesceString(row.form_section_title, fallback.formSectionTitle),
    successTitle: coalesceString(row.success_title, fallback.successTitle),
    termsSectionTitle: coalesceString(row.terms_section_title, fallback.termsSectionTitle),
    termsModalIntro: coalesceString(row.terms_modal_intro, fallback.termsModalIntro),
    footerNote: coalesceString(row.footer_note, fallback.footerNote),
    redemptionInstructions: asStringArray(
      row.redemption_instructions,
      fallback.redemptionInstructions,
    ),
    terms: asStringArray(row.terms, fallback.terms),
    participantIdentifierLabel: coalesceString(
      row.participant_identifier_label,
      fallback.participantIdentifierLabel,
    ),
    participantIdentifierPlaceholder: coalesceString(
      row.participant_identifier_placeholder,
      fallback.participantIdentifierPlaceholder,
    ),
    participantIdentifierPattern: coalesceString(
      row.participant_identifier_pattern,
      fallback.participantIdentifierPattern,
    ),
    participantIdentifierNormalizationPattern: coalesceString(
      row.participant_identifier_normalization_pattern,
      fallback.participantIdentifierNormalizationPattern,
    ),
    participantIdentifierInputMode: coalesceString(
      row.participant_identifier_input_mode,
      fallback.participantIdentifierInputMode,
    ),
    whatsappLabel: coalesceString(row.whatsapp_label, fallback.whatsappLabel),
    whatsappPlaceholder: coalesceString(row.whatsapp_placeholder, fallback.whatsappPlaceholder),
    whatsappCountryCode: coalesceString(
      row.whatsapp_country_code,
      fallback.whatsappCountryCode,
    ),
    whatsappLocalPattern: coalesceString(
      row.whatsapp_local_pattern,
      fallback.whatsappLocalPattern,
    ),
    whatsappFormatGroups: asNumberArray(
      row.whatsapp_format_groups,
      fallback.whatsappFormatGroups,
    ),
    adminTitle: coalesceString(row.admin_title, fallback.adminTitle),
    adminSubtitle: coalesceString(row.admin_subtitle, fallback.adminSubtitle),
    adminSearchPlaceholder: coalesceString(
      row.admin_search_placeholder,
      fallback.adminSearchPlaceholder,
    ),
    emailSubject: coalesceString(row.email_subject, fallback.emailSubject),
    emailHeadline: coalesceString(row.email_headline, fallback.emailHeadline),
    emailConfirmationMessage: coalesceString(
      row.email_confirmation_message,
      fallback.emailConfirmationMessage,
    ),
    emailInstructionsTitle: coalesceString(
      row.email_instructions_title,
      fallback.emailInstructionsTitle,
    ),
    emailTermsTitle: coalesceString(row.email_terms_title, fallback.emailTermsTitle),
  };

  syncDerivedSettings();
}

export function getCampaignSettings() {
  return campaignSettings;
}

export async function loadCampaignSettings(force = false) {
  if (!supabase || !isSupabaseConfigured) {
    return campaignSettings;
  }

  if (!force && campaignSettingsLoaded) {
    return campaignSettings;
  }

  if (!force && campaignSettingsRequest) {
    return campaignSettingsRequest;
  }

  campaignSettingsRequest = supabase
    .from("campaign_settings")
    .select("*")
    .limit(1)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        throw error;
      }

      if (data) {
        applyRemoteCampaignSettings(data);
      }

      campaignSettingsLoaded = true;
      return campaignSettings;
    })
    .finally(() => {
      campaignSettingsRequest = null;
    });

  return campaignSettingsRequest;
}

function getBasePath() {
  const path = window.location.pathname;

  if (path.endsWith(".html")) {
    return path.slice(0, path.lastIndexOf("/") + 1);
  }

  if (path.endsWith("/")) {
    return path;
  }

  return `${path}/`;
}

export function buildAppUrl(pageName = "index.html", params = new URLSearchParams()) {
  const url = new URL(window.location.origin);
  url.pathname = `${getBasePath()}${pageName}`;
  url.search = params.toString();
  return url.toString();
}

export function getSecretCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code") || params.get("promo") || params.get("secret");
  return normalizeCode(code || "");
}

export function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getParticipantIdentifierRegex() {
  return new RegExp(campaignSettings.participantIdentifierPattern, "i");
}

function getParticipantIdentifierNormalizationRegex() {
  return new RegExp(campaignSettings.participantIdentifierNormalizationPattern, "g");
}

export function normalizeParticipantIdentifier(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(getParticipantIdentifierNormalizationRegex(), "");
}

export function isValidParticipantIdentifier(value) {
  const rawValue = String(value || "").trim().toUpperCase();
  return getParticipantIdentifierRegex().test(rawValue);
}

export const normalizeDui = normalizeParticipantIdentifier;
export const isValidDui = isValidParticipantIdentifier;

function getWhatsAppCountryCodeDigits() {
  return String(campaignSettings.whatsappCountryCode || "").replace(/\D/g, "");
}

function stripWhatsAppCountryCode(digits) {
  const countryCode = getWhatsAppCountryCodeDigits();

  if (!countryCode) {
    return digits;
  }

  if (digits.startsWith(countryCode) && digits.length > countryCode.length) {
    return digits.slice(countryCode.length);
  }

  return digits;
}

function formatDigitsByGroups(digits, groups) {
  if (!digits) {
    return "";
  }

  const safeGroups = Array.isArray(groups) && groups.length ? groups : [4, 4];
  const chunks = [];
  let cursor = 0;

  safeGroups.forEach((groupSize) => {
    if (cursor >= digits.length) {
      return;
    }

    chunks.push(digits.slice(cursor, cursor + groupSize));
    cursor += groupSize;
  });

  if (cursor < digits.length) {
    chunks.push(digits.slice(cursor));
  }

  return chunks.join("-");
}

export function getWhatsAppDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function getWhatsAppLocalDigits(value) {
  return stripWhatsAppCountryCode(getWhatsAppDigits(value));
}

export function normalizeWhatsApp(value) {
  const digits = getWhatsAppLocalDigits(value);
  return formatDigitsByGroups(digits, campaignSettings.whatsappFormatGroups);
}

export function isValidWhatsApp(value) {
  const digits = getWhatsAppLocalDigits(value);
  return new RegExp(campaignSettings.whatsappLocalPattern).test(digits);
}

export function formatWhatsAppDisplay(value, { includeCountryCode = false } = {}) {
  const digits = getWhatsAppLocalDigits(value);

  if (!new RegExp(campaignSettings.whatsappLocalPattern).test(digits)) {
    return String(value || "");
  }

  const formatted = formatDigitsByGroups(digits, campaignSettings.whatsappFormatGroups);
  const countryCode = getWhatsAppCountryCodeDigits();

  if (!includeCountryCode || !countryCode) {
    return formatted;
  }

  return `+${countryCode} ${formatted}`;
}

export function isRegistrationClosed(now = new Date()) {
  return now.getTime() > registrationDeadline.getTime();
}

export function isRedemptionClosed(now = new Date()) {
  return now.getTime() > redemptionDeadline.getTime();
}

export function formatDateOnly(value) {
  return new Intl.DateTimeFormat(campaignSettings.locale, {
    dateStyle: "long",
    timeZone: campaignSettings.timeZone,
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat(campaignSettings.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: campaignSettings.timeZone,
  }).format(new Date(value));
}

export function setStatus(target, message = "", kind = "") {
  if (!target) {
    return;
  }

  target.textContent = message;

  if (!message || !kind) {
    delete target.dataset.kind;
    return;
  }

  target.dataset.kind = kind;
}

export function disableForm(form, disabled) {
  if (!form) {
    return;
  }

  form.querySelectorAll("input, button, textarea, select").forEach((control) => {
    if (control.dataset.locked === "always") {
      return;
    }

    control.disabled = disabled;
  });
}

export function applyTemplateTokens(template, values = {}) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    const value = values[token];
    return value == null ? "" : String(value);
  });
}

export function humanizeSupabaseError(error) {
  const source = `${error?.message || ""} ${error?.details || ""}`.toUpperCase();
  const identifierLabel = campaignSettings.participantIdentifierLabel;

  if (source.includes("AUTH_REQUIRED")) {
    return "Primero debes autenticar tu cuenta.";
  }

  if (source.includes("REGISTRATION_CLOSED")) {
    return "El periodo de registro ya cerro.";
  }

  if (source.includes("REDEMPTION_CLOSED")) {
    return "El periodo de canje ya cerro.";
  }

  if (source.includes("INVALID_CODE")) {
    return "La clave unica no existe o no esta activa.";
  }

  if (source.includes("CODE_ALREADY_USED")) {
    return "La clave ya fue usada anteriormente.";
  }

  if (source.includes("USER_ALREADY_REGISTERED")) {
    return "Este correo ya tiene un registro activo.";
  }

  if (
    source.includes("PARTICIPANT_IDENTIFIER_ALREADY_REGISTERED") ||
    source.includes("DUI_ALREADY_REGISTERED")
  ) {
    return `Este ${identifierLabel.toLowerCase()} ya fue registrado en la promocion.`;
  }

  if (
    source.includes("INVALID_PARTICIPANT_IDENTIFIER") ||
    source.includes("INVALID_DUI")
  ) {
    return `${identifierLabel} no cumple con el formato esperado.`;
  }

  if (source.includes("INVALID_WHATSAPP")) {
    return `El numero de ${campaignSettings.whatsappLabel} no cumple con el formato esperado.`;
  }

  if (source.includes("INVALID_EMAIL")) {
    return "El correo electronico no es valido.";
  }

  if (source.includes("NAME_REQUIRED")) {
    return "Nombre y apellido son obligatorios.";
  }

  if (source.includes("CLAIM_ALREADY_REDEEMED")) {
    return "Este beneficio ya fue marcado como canjeado.";
  }

  if (source.includes("CLAIM_NOT_FOUND")) {
    return "No encontramos el registro que intentas canjear.";
  }

  if (source.includes("ADMIN_REQUIRED")) {
    return "Tu correo no tiene permisos de administrador.";
  }

  if (source.includes("INVALID_LOGIN_CREDENTIALS")) {
    return "Correo o contrasena incorrectos.";
  }

  if (source.includes("EMAIL_NOT_CONFIRMED")) {
    return "Debes confirmar tu correo antes de iniciar sesion.";
  }

  if (source.includes("USER ALREADY REGISTERED")) {
    return "Ese correo ya existe. Usa iniciar sesion.";
  }

  if (source.includes("PASSWORD SHOULD BE AT LEAST 6 CHARACTERS")) {
    return "La contrasena debe tener al menos 6 caracteres.";
  }

  if (source.includes("PROVIDER IS NOT ENABLED")) {
    return "Debes habilitar este proveedor dentro de Supabase Auth.";
  }

  return error?.message || "Ocurrio un error inesperado al comunicar con Supabase.";
}
