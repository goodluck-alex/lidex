const authService = require("./auth.service");

async function login(req, res) {
  return authService.login({ body: req?.body });
}

async function logout(req, res) {
  return authService.logout({ user: req?.user });
}

async function me(req, res) {
  return authService.me({ user: req?.user });
}

module.exports = { login, logout, me };

