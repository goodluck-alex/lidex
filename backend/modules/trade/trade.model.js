function defaultPairs() {
  return ["LDX/USDT", "ETH/USDT", "BNB/USDT", "MATIC/USDT"];
}

function emptyOrderbook() {
  return { bids: [], asks: [] };
}

function normalizeOrder(order) {
  return order;
}

module.exports = { defaultPairs, emptyOrderbook, normalizeOrder };

