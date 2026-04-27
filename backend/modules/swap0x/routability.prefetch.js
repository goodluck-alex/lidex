const { PAIRS } = require("@lidex/shared");
const { routabilityChainIds, isPairRoutableOn0x } = require("./swap0x.routability");

function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const v = String(raw).trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "y" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "n" || v === "off") return false;
  return fallback;
}

function intervalMs() {
  const raw = parseInt(String(process.env.DEX_ROUTABILITY_PREFETCH_INTERVAL_MS || "180000"), 10);
  return Number.isFinite(raw) ? Math.max(30_000, raw) : 180_000;
}

function enabled() {
  return envBool("DEX_ROUTABILITY_PREFETCH_ENABLED", false);
}

async function runOnce() {
  const chains = routabilityChainIds();
  const all = [...(PAIRS?.phase1?.active || []), ...(PAIRS?.phase1?.comingSoon || [])];
  for (const cid of chains) {
    for (const p of all) {
      // eslint-disable-next-line no-await-in-loop
      await isPairRoutableOn0x({ chainId: cid, baseSymbol: p.base, quoteSymbol: p.quote }).catch(() => {});
    }
  }
}

function start() {
  if (!enabled()) return () => {};
  // fire and forget loop
  void runOnce();
  const t = setInterval(() => void runOnce(), intervalMs());
  return () => clearInterval(t);
}

module.exports = { start };

