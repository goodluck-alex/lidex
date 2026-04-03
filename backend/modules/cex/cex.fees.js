const Decimal = require("decimal.js");
const { CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("./cex.config");

function d(x) {
  return new Decimal(x || 0);
}

function getFeeBps() {
  const n = parseInt(process.env.CEX_FEE_BPS || "0", 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 5000);
}

/**
 * @param {number | null | undefined} override from staking tier / caller; must be 0..5000
 */
function resolvedTakerFeeBps(override) {
  if (override != null && Number.isFinite(Number(override))) {
    const o = Math.trunc(Number(override));
    return Math.min(Math.max(0, o), 5000);
  }
  return getFeeBps();
}

/** Taker bought base: fee taken in base (receive-side). */
function takerFeeOnBuyBase(qtyStr, feeBpsOverride) {
  const bps = resolvedTakerFeeBps(feeBpsOverride);
  if (!bps) return d(0);
  return d(qtyStr).times(bps).div(10000);
}

/** Taker sold base for quote: fee taken in quote (receive-side). */
function takerFeeOnSellQuote(priceStr, qtyStr, feeBpsOverride) {
  const bps = resolvedTakerFeeBps(feeBpsOverride);
  if (!bps) return d(0);
  return d(priceStr).times(d(qtyStr)).times(bps).div(10000);
}

let _treasuryId = undefined;

/**
 * Lazily resolves config address to a `User.id` (creates user row if needed).
 * @returns {Promise<string | null>}
 */
async function resolveTreasuryUserId() {
  if (_treasuryId !== undefined) return _treasuryId;
  const raw = String(process.env.CEX_FEE_TREASURY_ADDRESS || "").trim();
  if (!raw.startsWith("0x")) {
    _treasuryId = null;
    return null;
  }
  const { getOrCreateUserByAddress } = require("../users/users.model");
  const u = await getOrCreateUserByAddress(raw);
  _treasuryId = u.id;
  return _treasuryId;
}

function feeTreasuryAddressConfigured() {
  const raw = String(process.env.CEX_FEE_TREASURY_ADDRESS || "").trim();
  return raw.startsWith("0x") && raw.length >= 42;
}

module.exports = {
  getFeeBps,
  resolvedTakerFeeBps,
  takerFeeOnBuyBase,
  takerFeeOnSellQuote,
  resolveTreasuryUserId,
  feeTreasuryAddressConfigured,
  d,
  CEX_BASE_ASSET,
  CEX_QUOTE_ASSET,
};
