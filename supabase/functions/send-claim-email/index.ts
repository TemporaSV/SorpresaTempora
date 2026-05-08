import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const CLAIM_EMAIL_FROM = Deno.env.get("CLAIM_EMAIL_FROM") ?? "";
const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = Deno.env.get("GOOGLE_APPS_SCRIPT_WEBHOOK_URL") ?? "";
const GOOGLE_APPS_SCRIPT_SHARED_SECRET =
  Deno.env.get("GOOGLE_APPS_SCRIPT_SHARED_SECRET") ?? "";

type CampaignSettings = {
  brand_name: string;
  locale: string;
  time_zone: string;
  offer_title: string;
  redemption_deadline_at: string;
  redemption_instructions: string[];
  terms: string[];
  participant_identifier_label: string;
  whatsapp_label: string;
  whatsapp_country_code: string;
  whatsapp_local_pattern: string;
  whatsapp_format_groups: number[];
  email_subject: string;
  email_headline: string;
  email_confirmation_message: string;
  email_instructions_title: string;
  email_terms_title: string;
};

type PromotionClaim = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  participant_identifier: string;
  whatsapp_phone: string;
  claimed_code: string;
  notification_sent_at: string | null;
  notification_dispatch_key_hash: string | null;
};

function applyTemplateTokens(template: string, values: Record<string, string>) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    return values[token] ?? "";
  });
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function asNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [4, 4];
  }

  const numbers = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  return numbers.length ? numbers : [4, 4];
}

function stripCountryCode(digits: string, countryCode: string) {
  if (!countryCode) {
    return digits;
  }

  if (digits.startsWith(countryCode) && digits.length > countryCode.length) {
    return digits.slice(countryCode.length);
  }

  return digits;
}

function formatDigitsByGroups(digits: string, groups: number[]) {
  if (!digits) {
    return "";
  }

  const chunks: string[] = [];
  let cursor = 0;

  groups.forEach((groupSize) => {
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

function formatWhatsApp(value: string, settings: CampaignSettings) {
  const digits = String(value || "").replace(/\D/g, "");
  const countryCode = String(settings.whatsapp_country_code || "").replace(/\D/g, "");
  const localDigits = stripCountryCode(digits, countryCode);

  if (!new RegExp(settings.whatsapp_local_pattern).test(localDigits)) {
    return value;
  }

  const formatted = formatDigitsByGroups(localDigits, settings.whatsapp_format_groups);
  return countryCode ? `+${countryCode} ${formatted}` : formatted;
}

function formatDateOnly(value: string, settings: CampaignSettings) {
  return new Intl.DateTimeFormat(settings.locale || "es-SV", {
    dateStyle: "long",
    timeZone: settings.time_zone || "America/El_Salvador",
  }).format(new Date(value));
}

function renderList(items: string[]) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function emailSubject(settings: CampaignSettings, claim: PromotionClaim) {
  const subject = applyTemplateTokens(settings.email_subject, {
    brand_name: settings.brand_name,
    first_name: claim.first_name,
    offer_title: settings.offer_title,
  });

  if (subject.toLowerCase().includes(settings.brand_name.toLowerCase())) {
    return subject;
  }

  return `${settings.brand_name} - ${subject}`;
}

function htmlTemplate(settings: CampaignSettings, claim: PromotionClaim) {
  const tokenValues = {
    brand_name: settings.brand_name,
    first_name: claim.first_name,
    offer_title: settings.offer_title,
    redemption_deadline_date: formatDateOnly(settings.redemption_deadline_at, settings),
  };

  return `
    <div style="background:#07110d;padding:32px;font-family:Arial,sans-serif;color:#f5fbf7;">
      <div style="max-width:640px;margin:0 auto;background:#0d1b14;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
        <div style="padding:28px 28px 18px;background:linear-gradient(135deg,#00db72,#12b660);color:#041109;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">${settings.brand_name}</p>
          <h1 style="margin:0;font-size:32px;line-height:1.05;">${settings.email_headline}</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin-top:0;font-size:16px;line-height:1.7;">
            ${applyTemplateTokens(settings.email_confirmation_message, tokenValues)}
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;">
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">Correo</p>
              <strong>${claim.email}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">${settings.participant_identifier_label}</p>
              <strong>${claim.participant_identifier}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">${settings.whatsapp_label}</p>
              <strong>${formatWhatsApp(claim.whatsapp_phone, settings)}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">Codigo</p>
              <strong>${claim.claimed_code}</strong>
            </div>
            <div style="padding:14px;border-radius:16px;background:#0f241a;border:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f2e51d;">Vigencia</p>
              <strong>Hasta el ${formatDateOnly(settings.redemption_deadline_at, settings)}</strong>
            </div>
          </div>
          <h2 style="margin:24px 0 12px;font-size:18px;">${settings.email_instructions_title}</h2>
          <ul style="padding-left:18px;line-height:1.8;color:#d6e5db;">
            ${renderList(settings.redemption_instructions)}
          </ul>
          <h2 style="margin:24px 0 12px;font-size:18px;">${settings.email_terms_title}</h2>
          <ul style="padding-left:18px;line-height:1.8;color:#d6e5db;">
            ${renderList(settings.terms)}
          </ul>
        </div>
      </div>
    </div>
  `;
}

async function sendWithResend(settings: CampaignSettings, claim: PromotionClaim) {
  if (!RESEND_API_KEY || !CLAIM_EMAIL_FROM) {
    throw new Error("RESEND_NOT_CONFIGURED");
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CLAIM_EMAIL_FROM,
      to: [claim.email],
      subject: emailSubject(settings, claim),
      html: htmlTemplate(settings, claim),
    }),
  });

  if (!resendResponse.ok) {
    throw new Error(await resendResponse.text());
  }
}

async function sendWithGoogleAppsScript(settings: CampaignSettings, claim: PromotionClaim) {
  if (!GOOGLE_APPS_SCRIPT_WEBHOOK_URL || !GOOGLE_APPS_SCRIPT_SHARED_SECRET) {
    throw new Error("GMAIL_WEBHOOK_NOT_CONFIGURED");
  }

  const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret: GOOGLE_APPS_SCRIPT_SHARED_SECRET,
      to: claim.email,
      subject: emailSubject(settings, claim),
      html: htmlTemplate(settings, claim),
      fromName: settings.brand_name,
      replyTo: "",
      claim,
    }),
  });

  const rawText = await response.text();
  let payload: Record<string, unknown> | null = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(rawText || "GMAIL_WEBHOOK_FAILED");
  }

  if (payload && payload.ok === false) {
    throw new Error(String(payload.error || "GMAIL_WEBHOOK_FAILED"));
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (
    !GOOGLE_APPS_SCRIPT_WEBHOOK_URL &&
    (!RESEND_API_KEY || !CLAIM_EMAIL_FROM)
  ) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { claimId, notificationDispatchKey } = await request.json();

  if (!claimId || !notificationDispatchKey) {
    return new Response(JSON.stringify({ error: "Missing claimId or notificationDispatchKey" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: claimRow, error: claimError } = await adminClient
    .from("promotion_claims")
    .select(
      "id, first_name, last_name, email, participant_identifier, whatsapp_phone, claimed_code, notification_sent_at, notification_dispatch_key_hash",
    )
    .eq("id", claimId)
    .maybeSingle();

  const claim = (claimRow as PromotionClaim | null) ?? null;

  if (claimError || !claim) {
    return new Response(JSON.stringify({ error: "Claim not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (claim.notification_sent_at) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dispatchKeyHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(notificationDispatchKey)),
  );
  const dispatchKeyHashHex = Array.from(new Uint8Array(dispatchKeyHash))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");

  if (!claim.notification_dispatch_key_hash || claim.notification_dispatch_key_hash !== dispatchKeyHashHex) {
    return new Response(JSON.stringify({ error: "INVALID_NOTIFICATION_DISPATCH_KEY" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rawSettings, error: settingsError } = await adminClient
    .from("campaign_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (settingsError || !rawSettings) {
    return new Response(JSON.stringify({ error: "Campaign settings not found" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const settings: CampaignSettings = {
    brand_name: String(rawSettings.brand_name || "Tu Negocio"),
    locale: String(rawSettings.locale || "es-SV"),
    time_zone: String(rawSettings.time_zone || "America/El_Salvador"),
    offer_title: String(rawSettings.offer_title || "Beneficio exclusivo"),
    redemption_deadline_at: String(rawSettings.redemption_deadline_at || ""),
    redemption_instructions: asStringArray(rawSettings.redemption_instructions),
    terms: asStringArray(rawSettings.terms),
    participant_identifier_label: String(
      rawSettings.participant_identifier_label || "Documento",
    ),
    whatsapp_label: String(rawSettings.whatsapp_label || "WhatsApp"),
    whatsapp_country_code: String(rawSettings.whatsapp_country_code || "503"),
    whatsapp_local_pattern: String(rawSettings.whatsapp_local_pattern || "^[567][0-9]{7}$"),
    whatsapp_format_groups: asNumberArray(rawSettings.whatsapp_format_groups),
    email_subject: String(rawSettings.email_subject || "Tu registro fue confirmado"),
    email_headline: String(rawSettings.email_headline || "Tu registro fue confirmado"),
    email_confirmation_message: String(
      rawSettings.email_confirmation_message ||
        "Hola {{first_name}}, tu beneficio ya quedo registrado.",
    ),
    email_instructions_title: String(
      rawSettings.email_instructions_title || "Indicaciones para canjear",
    ),
    email_terms_title: String(rawSettings.email_terms_title || "Terminos y condiciones"),
  };

  try {
    if (GOOGLE_APPS_SCRIPT_WEBHOOK_URL) {
      await sendWithGoogleAppsScript(settings, claim);
    } else {
      await sendWithResend(settings, claim);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await adminClient
    .from("promotion_claims")
    .update({
      notification_sent_at: new Date().toISOString(),
      notification_dispatch_key_hash: null,
    })
    .eq("id", claimId);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
