const crypto = require("crypto");

const sessions = new Map(); // sessionId -> { userAddress, createdAt }

const COOKIE_NAME = "lidex_session";

function createSession(userAddress) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  sessions.set(sessionId, { userAddress: String(userAddress).toLowerCase(), createdAt: Date.now() });
  return sessionId;
}

function getSession(sessionId) {
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

function destroySession(sessionId) {
  if (!sessionId) return;
  sessions.delete(sessionId);
}

function cookieSecureFlag() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function cookieOptions() {
  const opts = {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecureFlag(),
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  if (process.env.COOKIE_DOMAIN) {
    opts.domain = process.env.COOKIE_DOMAIN;
  }
  return opts;
}

/** Match set-cookie options so logout clears the session in the browser. */
function clearCookieOptions() {
  const { path, sameSite, secure, domain } = cookieOptions();
  const out = { path, sameSite, secure };
  if (domain) out.domain = domain;
  return out;
}

module.exports = {
  COOKIE_NAME,
  createSession,
  getSession,
  destroySession,
  cookieOptions,
  clearCookieOptions,
};

