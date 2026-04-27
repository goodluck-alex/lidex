const { listProviders } = require("./providers.config");
const ox = require("./ox.provider");
const oneinch = require("./oneinch.provider");
const openocean = require("./openocean.provider");

function providerImpl(name) {
  const n = String(name || "").toLowerCase();
  if (n === "0x" || n === "ox") return { name: "0x", price: ox.price, indicative: ox.quote, firm: ox.quote };
  if (n === "1inch" || n === "oneinch") return { name: "1inch", indicative: oneinch.quote, firm: oneinch.swap };
  if (n === "openocean") return { name: "openocean", indicative: openocean.quote, firm: openocean.swap };
  return null;
}

function providers() {
  const names = listProviders();
  const impls = names.map(providerImpl).filter(Boolean);
  return impls.length ? impls : [providerImpl("0x")];
}

/**
 * Indicative quote using providers in order until one succeeds.
 */
async function indicativeWithFallback(req) {
  const errs = [];
  for (const p of providers()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const out = await p.indicative(req);
      return { ok: true, provider: p.name, out };
    } catch (e) {
      errs.push({ provider: p.name, code: e?.code, message: e?.message });
    }
  }
  const last = errs[errs.length - 1] || {};
  const err = new Error(last.message || "all swap providers failed");
  err.code = last.code || "AGGREGATOR_DOWN";
  err.statusCode = 502;
  err.details = { providers: errs };
  throw err;
}

/**
 * Firm quote (tx payload) using providers in order until one succeeds.
 * Non-0x providers require a real taker address; if missing, they are skipped.
 */
async function firmWithFallback(req) {
  const errs = [];
  const taker = String(req?.taker || "").trim();
  for (const p of providers()) {
    if (p.name !== "0x" && !taker) {
      errs.push({ provider: p.name, code: "BAD_REQUEST", message: "taker is required for provider" });
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const out = await p.firm(req);
      return { ok: true, provider: p.name, out };
    } catch (e) {
      errs.push({ provider: p.name, code: e?.code, message: e?.message });
    }
  }
  const last = errs[errs.length - 1] || {};
  const err = new Error(last.message || "all swap providers failed");
  err.code = last.code || "AGGREGATOR_DOWN";
  err.statusCode = 502;
  err.details = { providers: errs };
  throw err;
}

module.exports = { indicativeWithFallback, firmWithFallback };

