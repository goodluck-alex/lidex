const ledger = []; // newest last

function add(entry) {
  ledger.push(entry);
  return entry;
}

function confirm({ id, txHash }) {
  const idx = ledger.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  ledger[idx] = { ...ledger[idx], txHash: String(txHash), status: "confirmed", confirmedAt: Date.now() };
  return ledger[idx];
}

function markPaid({ id, payoutTxHash }) {
  const idx = ledger.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  ledger[idx] = { ...ledger[idx], payoutStatus: "paid", payoutTxHash: payoutTxHash ? String(payoutTxHash) : null, paidAt: Date.now() };
  return ledger[idx];
}

function listByUserAddress(addressLower) {
  if (!addressLower) return [];
  const a = String(addressLower).toLowerCase();
  return ledger.filter((e) => e.parentAddress === a || e.childAddress === a);
}

module.exports = { add, confirm, markPaid, listByUserAddress };

