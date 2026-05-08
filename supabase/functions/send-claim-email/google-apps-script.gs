const WEBHOOK_SECRET = "REEMPLAZA_ESTE_SECRETO";

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.secret !== WEBHOOK_SECRET) {
      return jsonResponse({ ok: false, error: "INVALID_SECRET" });
    }

    if (!payload.to || !payload.subject || !payload.html) {
      return jsonResponse({ ok: false, error: "MISSING_FIELDS" });
    }

    const remainingQuota = MailApp.getRemainingDailyQuota();

    if (remainingQuota < 1) {
      return jsonResponse({ ok: false, error: "GMAIL_QUOTA_EXCEEDED" });
    }

    MailApp.sendEmail({
      to: payload.to,
      subject: payload.subject,
      htmlBody: payload.html,
      name: payload.fromName || "Tu Negocio",
      replyTo: payload.replyTo || "",
    });

    return jsonResponse({ ok: true, remainingQuota });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}
