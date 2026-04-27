const { getMergedPhase1PairsAsync } = require("../../lib/dexPairsFromEnv");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TOKEN_DISPLAY } = require("@lidex/shared");
const {
  routabilityEnabled,
  includeRoutabilityField,
  hideUnroutable,
  isPairRoutableOn0x,
} = require("../swap0x/swap0x.routability");

function tokenMetaForTicker(sym) {
  const s = String(sym || "").trim().toUpperCase();
  const d = TOKEN_DISPLAY[s];
  return {
    symbol: s,
    name: d?.name || s,
    logoUrl: d?.logoUrl != null ? d.logoUrl : null
  };
}

function summarizeRoutability(details) {
  const baseToQuote = details?.baseToQuote;
  const quoteToBase = details?.quoteToBase;
  const checkedAt = Math.max(
    Number(baseToQuote?.checkedAt || 0),
    Number(quoteToBase?.checkedAt || 0)
  );
  const reason =
    (!baseToQuote?.routable && (baseToQuote?.reason || baseToQuote?.ok === false ? "base->quote unroutable" : null)) ||
    (!quoteToBase?.routable && (quoteToBase?.reason || quoteToBase?.ok === false ? "quote->base unroutable" : null)) ||
    null;
  return {
    chainId: details?.chainId || null,
    checkedAt: checkedAt || null,
    legs: {
      baseToQuote: {
        routable: baseToQuote?.routable === true,
        reason:
          baseToQuote?.routable === true
            ? null
            : String(baseToQuote?.reason || (baseToQuote?.ok === false ? "base->quote unroutable" : "base->quote unroutable")).slice(
                0,
                240
              ),
      },
      quoteToBase: {
        routable: quoteToBase?.routable === true,
        reason:
          quoteToBase?.routable === true
            ? null
            : String(quoteToBase?.reason || (quoteToBase?.ok === false ? "quote->base unroutable" : "quote->base unroutable")).slice(
                0,
                240
              ),
      },
    },
    // Keep short; intended for dashboards/logs, not user-facing UI.
    reason: reason ? String(reason).slice(0, 240) : null,
  };
}

async function listPairs() {
  const merged = await getMergedPhase1PairsAsync();

  // Optional: filter/demote pairs that are not routable on 0x (liquidityAvailable=false or quote errors).
  // This keeps the markets UI clean when liquidity is not live yet.
  let active = merged.active;
  let comingSoon = merged.comingSoon;
  const filterEnabled = routabilityEnabled();
  const includeField = includeRoutabilityField();
  if (filterEnabled) {
    const nextActive = [];
    const nextComing = [...comingSoon];
    for (const p of active) {
      // Symbols are chain-agnostic in Phase 1; we probe a single chain (default BSC=56).
      // If you run multi-chain DEX markets, you likely want per-chain pair lists.
      // For now, keep behavior simple and deterministic.
      // eslint-disable-next-line no-await-in-loop
      const r = await isPairRoutableOn0x({ baseSymbol: p.base, quoteSymbol: p.quote });
      const enriched = includeField
        ? { ...p, routableOn0x: r.routable, routability0x: summarizeRoutability(r.details) }
        : p;
      if (r.routable) nextActive.push(enriched);
      else if (!hideUnroutable()) nextComing.push({ ...enriched, status: "coming_soon" });
    }
    active = nextActive;
    comingSoon = nextComing;
  }

  // Optional: annotate routability without filtering (admin/debug).
  if (!filterEnabled && includeField) {
    const annotate = async (rows) => {
      const out = [];
      for (const p of rows) {
        // eslint-disable-next-line no-await-in-loop
        const r = await isPairRoutableOn0x({ baseSymbol: p.base, quoteSymbol: p.quote });
        out.push({ ...p, routableOn0x: r.routable, routability0x: summarizeRoutability(r.details) });
      }
      return out;
    };
    active = await annotate(active);
    comingSoon = await annotate(comingSoon);
  }

  const enrich = (rows) =>
    rows.map((p) => ({
      ...p,
      baseToken: tokenMetaForTicker(p.base),
      quoteToken: tokenMetaForTicker(p.quote)
    }));
  return { active: enrich(active), comingSoon: enrich(comingSoon) };
}

module.exports = { listPairs };

