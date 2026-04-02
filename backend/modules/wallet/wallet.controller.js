const walletService = require("./wallet.service");

async function portfolio(req, res) {
  return walletService.portfolio({ user: req?.user });
}

async function balances(req, res) {
  return walletService.balances({ user: req?.user });
}

async function deposit(req, res) {
  return walletService.deposit({ body: req?.body, user: req?.user });
}

async function withdraw(req, res) {
  return walletService.withdraw({ body: req?.body, user: req?.user });
}

async function transfer(req, res) {
  return walletService.transfer({ body: req?.body, user: req?.user });
}

module.exports = { portfolio, balances, deposit, withdraw, transfer };

