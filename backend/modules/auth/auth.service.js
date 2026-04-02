const authModel = require("./auth.model");

async function login({ body }) {
  return { ok: true, user: authModel.normalizeUser({ id: "placeholder" }), body };
}

async function logout() {
  return { ok: true };
}

async function me({ user }) {
  return { ok: true, user: user || null };
}

module.exports = { login, logout, me };

