const { getMergedPhase1PairsAsync } = require("../../lib/dexPairsFromEnv");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TOKEN_DISPLAY } = require("@lidex/shared");

function tokenMetaForTicker(sym) {
  const s = String(sym || "").trim().toUpperCase();
  const d = TOKEN_DISPLAY[s];
  return {
    symbol: s,
    name: d?.name || s,
    logoUrl: d?.logoUrl != null ? d.logoUrl : null
  };
}

async function listPairs() {
  const merged = await getMergedPhase1PairsAsync();
  const enrich = (rows) =>
    rows.map((p) => ({
      ...p,
      baseToken: tokenMetaForTicker(p.base),
      quoteToken: tokenMetaForTicker(p.quote)
    }));
  return { active: enrich(merged.active), comingSoon: enrich(merged.comingSoon) };
}

module.exports = { listPairs };

