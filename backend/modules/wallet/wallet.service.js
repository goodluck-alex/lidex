const walletModel = require("./wallet.model");

async function portfolio({ user }) {
  return { ok: true, portfolio: walletModel.emptyPortfolio(), user: user || null };
}

async function balances({ user }) {
  return { ok: true, balances: walletModel.emptyBalances(), user: user || null };
}

async function deposit({ body, user }) {
  return { ok: true, deposit: { id: "placeholder" }, body, user: user || null };
}

async function withdraw({ body, user }) {
  return { ok: true, withdraw: { id: "placeholder" }, body, user: user || null };
}

async function transfer({ body, user }) {
  return { ok: true, transfer: { id: "placeholder" }, body, user: user || null };
}

module.exports = { portfolio, balances, deposit, withdraw, transfer };

