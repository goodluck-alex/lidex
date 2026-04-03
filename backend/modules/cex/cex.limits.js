const Decimal = require("decimal.js");
const { CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("./cex.config");

function d(x) {
  return new Decimal(x || 0);
}

function parseOptionalPositive(envVal) {
  if (envVal === undefined || envVal === null || String(envVal).trim() === "") return null;
  const x = d(String(envVal).trim());
  return x.lte(0) ? null : x;
}

function minNotionalQuote() {
  return parseOptionalPositive(process.env.CEX_MIN_NOTIONAL_QUOTE);
}

function minQtyBase() {
  return parseOptionalPositive(process.env.CEX_MIN_QTY_BASE);
}

/**
 * @param {{ price: Decimal, quantity: Decimal, side: string }} p
 */
function validateNewLimitOrder(p) {
  const notional = p.price.times(p.quantity);
  const mn = minNotionalQuote();
  if (mn && notional.lt(mn)) {
    throw Object.assign(
      new Error(`order notional below minimum (${mn.toString()} ${CEX_QUOTE_ASSET})`),
      { code: "BELOW_MIN_NOTIONAL" }
    );
  }
  const mq = minQtyBase();
  if (mq && p.quantity.lt(mq)) {
    throw Object.assign(
      new Error(`order size below minimum (${mq.toString()} ${CEX_BASE_ASSET})`),
      { code: "BELOW_MIN_QTY" }
    );
  }
}

/** Before placing a market sell (base size known upfront). */
function validateMarketSellQuantity(quantity) {
  const mq = minQtyBase();
  if (mq && quantity.lt(mq)) {
    throw Object.assign(
      new Error(`order size below minimum (${mq.toString()} ${CEX_BASE_ASSET})`),
      { code: "BELOW_MIN_QTY" }
    );
  }
}

/** After matching: quote-side notional vs filled base (both sides). */
function validateExecutedNotional(quoteNotional, baseFilled) {
  const mn = minNotionalQuote();
  if (!mn || baseFilled.lte(0)) return;
  if (quoteNotional.lt(mn)) {
    throw Object.assign(
      new Error(`executed notional below minimum (${mn.toString()} ${CEX_QUOTE_ASSET})`),
      { code: "BELOW_MIN_NOTIONAL" }
    );
  }
}

module.exports = {
  validateNewLimitOrder,
  validateMarketSellQuantity,
  validateExecutedNotional,
  minNotionalQuote,
  minQtyBase,
  d,
};
