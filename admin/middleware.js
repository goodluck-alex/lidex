/**
 * Top-level `lidex/admin` — operator API gate (used by `backend/server.js`).
 * Send `Authorization: Bearer <key>` or `X-Admin-Key: <key>`.
 *
 * Phase F: optional `ADMIN_API_KEYS_JSON` for scoped roles; else legacy `ADMIN_API_KEY` = super.
 * Optional `ADMIN_IP_ALLOWLIST` — see docs/admin-authz.md.
 */
const {
  loadAdminKeyRegistry,
  matchAdminKey,
  fingerprintForKey,
  adminRolesAuthorize,
  adminIpAllowed,
  registerAdminApproverKey,
} = require("./authz");

function adminApiKeyConfigured() {
  try {
    return loadAdminKeyRegistry().length > 0;
  } catch {
    return false;
  }
}

function requireAdminApiKey(req, res, next) {
  let registry;
  try {
    registry = loadAdminKeyRegistry();
  } catch (e) {
    return res.status(503).json({
      ok: false,
      error: `admin config invalid: ${e?.message || e}`,
      code: "ADMIN_CONFIG_ERROR",
    });
  }

  if (!registry.length) {
    return res.status(503).json({
      ok: false,
      error: "admin API disabled (set ADMIN_API_KEY or ADMIN_API_KEYS_JSON)",
      code: "ADMIN_DISABLED",
    });
  }

  if (!adminIpAllowed(req)) {
    return res.status(403).json({
      ok: false,
      error: "forbidden (admin IP allowlist)",
      code: "ADMIN_IP_FORBIDDEN",
    });
  }

  const hdr = String(req.headers.authorization || "");
  const bearer = hdr.toLowerCase().startsWith("bearer ") ? hdr.slice(7).trim() : "";
  const xkey = String(req.headers["x-admin-key"] || "").trim();
  const presented = bearer || xkey;
  const row = matchAdminKey(presented);
  if (!row) {
    return res.status(401).json({ ok: false, error: "unauthorized", code: "UNAUTHORIZED" });
  }

  req.adminKeyFingerprint = fingerprintForKey(row.key);

  const approverGate = registerAdminApproverKey(req, row);
  if (!approverGate.ok) {
    return res.status(approverGate.status).json(approverGate.body);
  }

  const path = req.path || req.url || "";
  if (!adminRolesAuthorize(row.roles, req.method, path)) {
    return res.status(403).json({
      ok: false,
      error: "forbidden for this key role (requires super for mutations / this route)",
      code: "ADMIN_FORBIDDEN",
    });
  }

  next();
}

module.exports = { requireAdminApiKey, adminApiKeyConfigured };
