const store = require("./fees.store");
const treasury = require("./fees.treasury");

function getSwapFeeConfig() {
  // Centralized source of truth (Phase 1: env-driven, DB-ready later)
  const swapFeeRecipient = process.env.SWAP_FEE_RECIPIENT || null;
  const swapFeeBps = process.env.SWAP_FEE_BPS || null;
  const swapFeeToken = process.env.SWAP_FEE_TOKEN || null;
  return { swapFeeRecipient, swapFeeBps, swapFeeToken };
}

function recordSwapIntegratorFee({ id, chainId, userAddress, feeToken, feeAmount }) {
  if (!feeToken || feeAmount == null) return null;
  const ev = {
    id: String(id),
    kind: "swap.integratorFee",
    chainId: Number(chainId),
    userAddress: userAddress ? String(userAddress).toLowerCase() : null,
    feeToken: String(feeToken).toLowerCase(),
    feeAmount: String(feeAmount),
    createdAt: Date.now()
  };
  return store.add(ev);
}

function summary() {
  return store.summary();
}

function list({ limit } = {}) {
  return store.list({ limit });
}

function creditTreasury({ id, chainId, token, amount }) {
  // Phase 1: accounting only (on-chain distribution happens later)
  return treasury.credit({ id, chainId, token, amount });
}

function treasuryTotals() {
  return treasury.totals();
}

module.exports = { getSwapFeeConfig, recordSwapIntegratorFee, creditTreasury, treasuryTotals, summary, list };

