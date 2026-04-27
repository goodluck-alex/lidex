function safeString(x, max = 300) {
  const s = x == null ? "" : String(x);
  return s.length > max ? s.slice(0, max) : s;
}

function isObject(x) {
  return x != null && typeof x === "object";
}

/**
 * Convert an internal thrown error into a stable API error payload.
 * We intentionally keep it small and predictable for frontend UX.
 *
 * @param {any} err
 * @param {{ fallbackMessage?: string, fallbackCode?: string, fallbackStatus?: number }} opts
 */
function toPublicError(err, opts = {}) {
  const fallbackMessage = opts.fallbackMessage || "request failed";
  const fallbackCode = opts.fallbackCode || "INTERNAL_ERROR";
  const fallbackStatus = Number(opts.fallbackStatus || 500);

  const statusCode = Number(err?.statusCode || err?.status || fallbackStatus) || fallbackStatus;
  const codeRaw = err?.code || err?.errorCode || fallbackCode;
  const code = safeString(codeRaw || fallbackCode, 64) || fallbackCode;
  const message = safeString(err?.message || fallbackMessage, 400) || fallbackMessage;

  // Details can be large; keep only objects/strings and truncate.
  let details = undefined;
  if (isObject(err?.details)) {
    details = err.details;
  } else if (typeof err?.details === "string") {
    details = { info: safeString(err.details, 500) };
  }

  return {
    statusCode,
    body: {
      ok: false,
      code,
      message,
      // backward compatibility
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

module.exports = { toPublicError };

