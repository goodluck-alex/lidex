const tradeService = require("./trade.service");

async function pairs(req, res) {
  return tradeService.pairs();
}

async function orderbook(req, res) {
  return tradeService.orderbook({ query: req?.query });
}

async function placeOrder(req, res) {
  return tradeService.placeOrder({ body: req?.body, user: req?.user });
}

async function openOrders(req, res) {
  return tradeService.openOrders({ user: req?.user });
}

async function trades(req, res) {
  return tradeService.trades({ query: req?.query });
}

module.exports = { pairs, orderbook, placeOrder, openOrders, trades };

