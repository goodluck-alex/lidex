const { withBreaker } = require("../../lib/circuitBreaker");

const BASE = "https://open-api.openocean.finance";

function mapError(status, data) {
  if (status === 429) return { code: "RATE_LIMITED", statusCode: 429, message: "swap provider rate limited" };
  if (status >= 500) return { code: "AGGREGATOR_DOWN", statusCode: 502, message: "swap provider unavailable" };
  const msg = data?.error || data?.message || `openocean error (${status})`;
  const err = { code: "AGGREGATOR_ERROR", statusCode: 502, message: String(msg) };
  if (String(msg).toLowerCase().includes("insufficient") || String(msg).toLowerCase().includes("no route")) {
    err.code = "NO_LIQUIDITY";
    err.statusCode = 422;
    err.message = "no liquidity route found";
  }
  return err;
}

function makeError(mapped, details) {
  const e = new Error(mapped.message);
  e.code = mapped.code;
  e.statusCode = mapped.statusCode;
  e.details = details;
  return e;
}

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function chainKey(chainId) {
  // OpenOcean accepts chain names or ids; we pass the numeric id.
  return String(chainId);
}

async function quote({ chainId, sellToken, buyToken, sellAmount, slippagePercentage }) {
  const params = new URLSearchParams();
  params.set("inTokenAddress", sellToken);
  params.set("outTokenAddress", buyToken);
  // V4 uses amountDecimals (base units)
  params.set("amountDecimals", String(sellAmount));
  // Docs: slippage is percent string (1 = 1%)
  if (typeof slippagePercentage === "number") params.set("slippage", String(slippagePercentage * 100));
  // gasPriceDecimals required by docs; use 1 gwei default
  params.set("gasPriceDecimals", String(process.env.OPENOCEAN_GAS_PRICE_WEI || "1000000000"));

  const url = `${BASE}/v4/${chainKey(chainId)}/quote?${params.toString()}`;
  const { res, data } = await withBreaker("openocean", () => getJson(url));
  if (!res.ok) throw makeError(mapError(res.status, data), data);
  return { provider: "openocean", raw: data };
}

async function swap({ chainId, sellToken, buyToken, sellAmount, taker, slippagePercentage }) {
  const params = new URLSearchParams();
  params.set("inTokenAddress", sellToken);
  params.set("outTokenAddress", buyToken);
  params.set("amountDecimals", String(sellAmount));
  if (typeof slippagePercentage === "number") params.set("slippage", String(slippagePercentage * 100));
  params.set("gasPriceDecimals", String(process.env.OPENOCEAN_GAS_PRICE_WEI || "1000000000"));
  if (taker) params.set("account", taker);
  const url = `${BASE}/v4/${chainKey(chainId)}/swap?${params.toString()}`;
  const { res, data } = await withBreaker("openocean", () => getJson(url));
  if (!res.ok) throw makeError(mapError(res.status, data), data);
  return { provider: "openocean", raw: data };
}

module.exports = { quote, swap };

