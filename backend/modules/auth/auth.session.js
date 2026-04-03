const crypto = require("crypto");
const { prisma } = require("../../lib/prisma");

const COOKIE_NAME = "lidex_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days (matches cookie maxAge)

async function createSession(userAddress) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  const addr = String(userAddress).toLowerCase();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.authSession.create({
    data: { id: sessionId, userAddress: addr, expiresAt },
  });
  return sessionId;
}

async function getSession(sessionId) {
  if (!sessionId) return null;
  const row = await prisma.authSession.findUnique({ where: { id: sessionId } });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.authSession.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  return { userAddress: row.userAddress, createdAt: row.createdAt.getTime() };
}

async function destroySession(sessionId) {
  if (!sessionId) return;
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
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
    maxAge: SESSION_MAX_AGE_MS,
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
