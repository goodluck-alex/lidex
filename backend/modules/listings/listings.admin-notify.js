const crypto = require("crypto");

const UA = "lidex-backend/listings-admin-notify";

/**
 * Outbound webhook for operations / admin department (Slack, Zapier, internal dashboard, etc.).
 * Fire-and-forget; logs warnings on failure. Does not throw.
 * @param {Record<string, unknown>} payload
 */
async function notifyAdminListingApplication(payload) {
  const url = String(process.env.LISTING_ADMIN_WEBHOOK_URL || "").trim();
  if (!url) return;

  let body;
  try {
    body = JSON.stringify({
      ...payload,
      _meta: { sentAt: new Date().toISOString(), event: "token_listing_application" },
    });
  } catch (e) {
    console.warn("[listings-admin-webhook] serialize failed", e instanceof Error ? e.message : e);
    return;
  }

  const secret = String(process.env.LISTING_ADMIN_WEBHOOK_SECRET || "").trim();
  /** @type {Record<string, string>} */
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": UA,
  };
  if (secret) {
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    headers["X-Lidex-Signature"] = `sha256=${sig}`;
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(url, { method: "POST", headers, body, signal: ac.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.warn("[listings-admin-webhook] HTTP", res.status, txt.slice(0, 500));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[listings-admin-webhook]", msg);
  } finally {
    clearTimeout(t);
  }
}

module.exports = { notifyAdminListingApplication };
