function firstDefined(...xs) {
  for (const x of xs) if (x !== undefined && x !== null) return x;
  return null;
}

function toNumOrNull(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalize a raw 0x quote into a stable, frontend-friendly summary.
 * Keep it conservative: only fields we can depend on.
 */
function normalizeQuoteSummary(q) {
  const buyAmount = firstDefined(q?.buyAmount, q?.minBuyAmount);
  const sellAmount = firstDefined(q?.sellAmount, null);
  const minBuyAmount = firstDefined(q?.minBuyAmount, null);

  const integratorFee = q?.fees?.integratorFee
    ? {
        token: q.fees.integratorFee.token || null,
        amount: q.fees.integratorFee.amount || null,
      }
    : null;

  const gas = firstDefined(q?.transaction?.gas, q?.gas, null);
  const gasPrice = firstDefined(q?.transaction?.gasPrice, null);
  const value = firstDefined(q?.transaction?.value, null);

  return {
    provider: "0x",
    zid: q?.zid || null,
    chainId: toNumOrNull(q?.chainId),
    sellToken: q?.sellToken || null,
    buyToken: q?.buyToken || null,
    sellAmount: sellAmount != null ? String(sellAmount) : null,
    buyAmount: buyAmount != null ? String(buyAmount) : null,
    minBuyAmount: minBuyAmount != null ? String(minBuyAmount) : null,
    allowanceTarget: q?.allowanceTarget || null,
    liquidityAvailable: q?.liquidityAvailable !== false,
    integratorFee,
    tx: q?.transaction
      ? {
          to: q.transaction.to || null,
          data: q.transaction.data || null,
          value: value != null ? String(value) : null,
          gas: gas != null ? String(gas) : null,
          gasPrice: gasPrice != null ? String(gasPrice) : null,
        }
      : null,
    warnings: [],
  };
}

module.exports = { normalizeQuoteSummary };

