const ox = require("../swap0x/swap0x.service");

async function quote(req) {
  const q = await ox.quote(req);
  return { provider: "0x", raw: q };
}

async function price(req) {
  const p = await ox.price(req);
  return { provider: "0x", raw: p };
}

module.exports = { quote, price, DEFAULT_TAKER: ox.DEFAULT_TAKER };

