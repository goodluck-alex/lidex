const swap0x = require("./swap0x.service");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TOKENS } = require("@lidex/shared");

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const v = String(raw).trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "y" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "n" || v === "off") return false;
  return fallback;
}

function parseIntOr(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

function cacheMs() {
  return parseIntOr("DEX_ROUTABILITY_CACHE_MS", 5 * 60 * 1000);
}

function routabilityEnabled() {
  return envBool("DEX_ROUTABILITY_FILTER_ENABLED", false);
}

function includeRoutabilityField() {
  return envBool("DEX_ROUTABILITY_INCLUDE_FIELD", false);
}

function hideUnroutable() {
  // If true: omit unroutable pairs from both lists. If false: demote active → coming_soon.
  return envBool("DEX_HIDE_UNROUTABLE_PAIRS", false);
}

function routabilityChainId() {
  return parseIntOr("DEX_ROUTABILITY_CHAIN_ID", 56);
}

function routabilityChainIds() {
  const raw = String(process.env.DEX_ROUTABILITY_CHAIN_IDS || "").trim();
  if (!raw) return [routabilityChainId()];
  const ids = raw
    .split(",")
    .map((s) => parseInt(String(s).trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ids.length ? [...new Set(ids)] : [routabilityChainId()];
}

function usePriceEndpoint() {
  return String(process.env.DEX_ROUTABILITY_USE_PRICE || "true").toLowerCase() !== "false";
}

function tokenPreset(chainId, symbol) {
  const cid = Number(chainId);
  const sym = String(symbol || "").trim().toUpperCase();
  const map = TOKENS?.phase1?.[cid];
  const t = map?.[sym];
  if (!t?.address) return null;
  return { address: String(t.address), decimals: Number(t.decimals ?? 18) };
}

function tinyAmountForDecimals(decimals) {
  const d = Number.isFinite(Number(decimals)) ? Number(decimals) : 18;
  // Use 10^(d-3) for a "0.001" equivalent, but clamp lower bound to 1.
  const pow = Math.max(0, d - 3);
  const raw = 10n ** BigInt(pow);
  return raw > 0n ? raw.toString() : "1";
}

/** @type {Map<string, { ok: boolean, routable: boolean, checkedAt: number, reason?: string }>} */
const cache = new Map();

function cacheKey({ chainId, sellToken, buyToken }) {
  return `${chainId}|${String(sellToken).toLowerCase()}|${String(buyToken).toLowerCase()}`;
}

async function checkLeg({ chainId, sellToken, buyToken, sellAmount }) {
  const key = cacheKey({ chainId, sellToken, buyToken });
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.checkedAt < cacheMs()) return hit;

  try {
    const q = usePriceEndpoint()
      ? await swap0x.price({
          chainId,
          sellToken,
          buyToken,
          sellAmount,
          slippagePercentage: 0.01,
        })
      : await swap0x.quote({
          chainId,
          sellToken,
          buyToken,
          sellAmount,
          slippagePercentage: 0.01,
        });
    const routable = q?.liquidityAvailable !== false;
    const out = {
      ok: true,
      routable,
      checkedAt: now,
      ...(routable ? {} : { reason: "liquidityAvailable=false" }),
    };
    cache.set(key, out);
    return out;
  } catch (e) {
    // Treat errors as "unroutable" for listing purposes (keeps UX clean).
    const reason = e?.details?.reason || e?.message || "0x quote error";
    const out = { ok: false, routable: false, checkedAt: now, reason: String(reason).slice(0, 240) };
    cache.set(key, out);
    return out;
  }
}

/**
 * Determine if a product pair is routable on 0x for a chain.
 * We check BOTH directions because some new pools can be one-sided early.
 *
 * @param {{ chainId?: number, baseSymbol: string, quoteSymbol: string }} input
 * @returns {Promise<{ routable: boolean, details: { baseToQuote: any, quoteToBase: any, chainId: number } }>}
 */
async function isPairRoutableOn0x({ chainId, baseSymbol, quoteSymbol }) {
  const cid = Number.isFinite(Number(chainId)) ? Number(chainId) : routabilityChainId();
  const base = tokenPreset(cid, baseSymbol);
  const quote = tokenPreset(cid, quoteSymbol);
  if (!base || !quote) {
    return {
      routable: false,
      details: {
        chainId: cid,
        baseToQuote: { ok: false, routable: false, reason: "missing token preset" },
        quoteToBase: { ok: false, routable: false, reason: "missing token preset" },
      },
    };
  }

  const baseToQuote = await checkLeg({
    chainId: cid,
    sellToken: base.address,
    buyToken: quote.address,
    sellAmount: tinyAmountForDecimals(base.decimals),
  });

  const quoteToBase = await checkLeg({
    chainId: cid,
    sellToken: quote.address,
    buyToken: base.address,
    sellAmount: tinyAmountForDecimals(quote.decimals),
  });

  const routable = baseToQuote.routable && quoteToBase.routable;
  return { routable, details: { baseToQuote, quoteToBase, chainId: cid } };
}

module.exports = {
  routabilityEnabled,
  includeRoutabilityField,
  hideUnroutable,
  routabilityChainId,
  routabilityChainIds,
  usePriceEndpoint,
  isPairRoutableOn0x,
};

