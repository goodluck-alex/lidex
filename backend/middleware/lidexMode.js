const HEADER = "x-lidex-mode";
const MODE_COOKIE = "lidex_mode";

function normalizeMode(value) {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "dex" || v === "cex") return v;
  return null;
}

/**
 * Resolve hybrid mode for this request. Prefer `X-Lidex-Mode` so cross-origin
 * browsers (Next on :3001 → API on :4000) still send context; optional `lidex_mode`
 * cookie when frontend and API share a site.
 */
function resolveLidexMode(req) {
  const rawHeader = req.headers[HEADER] ?? req.headers["X-Lidex-Mode"];
  if (typeof rawHeader === "string") {
    const m = normalizeMode(rawHeader);
    if (m) return m;
  }
  const c = req.cookies?.[MODE_COOKIE];
  const fromCookie = normalizeMode(typeof c === "string" ? c : "");
  if (fromCookie) return fromCookie;
  return null;
}

function lidexModeMiddleware(req, res, next) {
  req.lidexMode = resolveLidexMode(req);
  next();
}

function requireLidexMode(req, res, next) {
  if (!req.lidexMode) {
    return res.status(400).json({
      ok: false,
      error: "X-Lidex-Mode header required (dex or cex); must match UI lidex_mode",
    });
  }
  next();
}

function requireDexMode(req, res, next) {
  if (req.lidexMode !== "dex") {
    return res.status(403).json({
      ok: false,
      error: "this endpoint is available in DEX mode only",
    });
  }
  next();
}

function requireCexMode(req, res, next) {
  if (req.lidexModeIgnore) return next();
  if (req.lidexMode !== "cex") {
    return res.status(403).json({
      ok: false,
      error: "this endpoint is available in CEX (internal) mode only",
    });
  }
  next();
}

module.exports = {
  lidexModeMiddleware,
  requireLidexMode,
  requireDexMode,
  requireCexMode,
  MODE_COOKIE,
};
