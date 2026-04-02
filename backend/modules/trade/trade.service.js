const tradeModel = require("./trade.model");

async function pairs() {
  return { ok: true, pairs: tradeModel.defaultPairs() };
}

async function orderbook({ query }) {
  return { ok: true, orderbook: tradeModel.emptyOrderbook(), query };
}

async function placeOrder({ body, user }) {
  return { ok: true, order: tradeModel.normalizeOrder({ id: "placeholder" }), body, user: user || null };
}

async function openOrders({ user }) {
  return { ok: true, orders: [], user: user || null };
}

async function trades({ query }) {
  return { ok: true, trades: [], query };
}

module.exports = { pairs, orderbook, placeOrder, openOrders, trades };

