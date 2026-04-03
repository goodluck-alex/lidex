const { PAIRS } = require("@lidex/shared");

const ENV_ACTIVE = "DEX_ACTIVE_PAIR_SYMBOLS";
const ENV_ACTIVE_ALT = "ACTIVE_DEX_PAIR_SYMBOLS";
const POOL_PREFIX = "DEX_POOL_";

/**
 * Symbols to promote from `coming_soon` → `active` (markets / pairs API).
 * Comma-separated, case-insensitive; must match `shared/pairs.js` symbols (e.g. LDX/USDT).
 * 0x quoting still requires on-chain AMM liquidity — this only updates product listing state.
 */
function parseActivePairSymbols() {
  const raw = process.env[ENV_ACTIVE] || process.env[ENV_ACTIVE_ALT] || "";
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function dbActivationMergeEnabled() {
  return String(process.env.DEX_PAIR_DB_ACTIVATION_ENABLED || "true").toLowerCase() !== "false";
}

/**
 * @param {Set<string>} promoteSet uppercased symbols
 */
function mergePhase1WithPromoteSet(promoteSet) {
  const base = PAIRS.phase1;
  const pending = new Set(promoteSet);
  const active = [...base.active];
  const nextComing = [];

  for (const row of base.comingSoon) {
    const sym = String(row.symbol).toUpperCase();
    if (pending.has(sym)) {
      active.push({ ...row, status: "active" });
      pending.delete(sym);
    } else {
      nextComing.push(row);
    }
  }

  for (const sym of pending) {
    // eslint-disable-next-line no-console
    console.warn(`[lidex] ${ENV_ACTIVE}: no coming_soon pair "${sym}" — ignored`);
  }

  return { active, comingSoon: nextComing };
}

/** Env-only merge (e.g. tests, scripts); markets use `getMergedPhase1PairsAsync`. */
function getMergedPhase1Pairs() {
  return mergePhase1WithPromoteSet(new Set(parseActivePairSymbols()));
}

/**
 * Env promotions + active rows in `dex_pair_activations` (Phase 7+).
 */
async function getMergedPhase1PairsAsync() {
  const envSet = parseActivePairSymbols();
  if (!dbActivationMergeEnabled()) {
    return mergePhase1WithPromoteSet(new Set(envSet));
  }
  try {
    const { prisma } = require("./prisma");
    const rows = await prisma.dexPairActivation.findMany({
      where: { active: true },
      select: { symbol: true },
    });
    const dbSyms = rows.map((r) => String(r.symbol).trim().toUpperCase()).filter(Boolean);
    return mergePhase1WithPromoteSet(new Set([...envSet, ...dbSyms]));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[lidex] dex_pair_activations unreadable, using env only:", e?.message || e);
    return mergePhase1WithPromoteSet(new Set(envSet));
  }
}

async function logDexPairActivationDbSummary() {
  if (!dbActivationMergeEnabled()) return;
  try {
    const { prisma } = require("./prisma");
    const n = await prisma.dexPairActivation.count({ where: { active: true } });
    if (n) {
      // eslint-disable-next-line no-console
      console.log(`[lidex] dex_pair_activations: ${n} active row(s) merged with ${ENV_ACTIVE}`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[lidex] dex_pair_activations count skipped:", e?.message || e);
  }
}

/**
 * Optional AMM pool (e.g. Pancake pair) addresses for ops / future health checks.
 * 0x does not read these; set when you want them recorded next to env-driven activation.
 *
 * Pattern: DEX_POOL_<CHAIN>_<BASE>_<QUOTE>=0x...
 * Example: DEX_POOL_BSC_LDX_USDT=0x...
 *          DEX_POOL_BSC_LDX_BNB=0x...   (pair symbol LDX/BNB, pool may be LDX/WBNB)
 */
function parseDexPoolEntries() {
  const entries = [];
  for (const [key, val] of Object.entries(process.env)) {
    if (!key.startsWith(POOL_PREFIX)) continue;
    const addr = String(val || "").trim();
    if (!addr.startsWith("0x")) continue;
    const rest = key.slice(POOL_PREFIX.length);
    const parts = rest.split("_").filter(Boolean);
    if (parts.length < 3) continue;
    const chainKey = parts[0];
    const base = parts[1];
    const quote = parts.slice(2).join("_");
    entries.push({
      envKey: key,
      chainKey,
      base,
      quote,
      symbol: `${base}/${quote}`,
      address: addr,
    });
  }
  return entries;
}

function logDexEnvSummary() {
  const promoted = parseActivePairSymbols();
  if (promoted.length) {
    // eslint-disable-next-line no-console
    console.log(`[lidex] DEX env: promoted to active: ${promoted.join(", ")}`);
  }
  const pools = parseDexPoolEntries();
  if (pools.length) {
    // eslint-disable-next-line no-console
    console.log(
      `[lidex] DEX env: ${pools.length} AMM pool(s) recorded (${pools.map((p) => p.envKey).join(", ")})`
    );
  }
}

module.exports = {
  getMergedPhase1Pairs,
  getMergedPhase1PairsAsync,
  mergePhase1WithPromoteSet,
  parseActivePairSymbols,
  parseDexPoolEntries,
  logDexEnvSummary,
  logDexPairActivationDbSummary,
  dbActivationMergeEnabled,
  ENV_ACTIVE,
  POOL_PREFIX,
};
