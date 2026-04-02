const credits = []; // newest last

function credit({ id, chainId, token, amount }) {
  const entry = {
    id: String(id),
    chainId: Number(chainId),
    token: String(token || "").toLowerCase(),
    amount: String(amount || "0"),
    createdAt: Date.now()
  };
  credits.push(entry);
  return entry;
}

function totals() {
  const byToken = {};
  for (const c of credits) {
    const t = c.token || "unknown";
    const a = BigInt(String(c.amount || "0"));
    byToken[t] = (byToken[t] || 0n) + a;
  }
  return Object.fromEntries(Object.entries(byToken).map(([k, v]) => [k, v.toString()]));
}

module.exports = { credit, totals };

