const { withBreaker } = require("../../lib/circuitBreaker");

const BASE = "https://api.1inch.com";

function assertEnv() {
  const key = String(process.env.ONEINCH_API_KEY || "").trim();
  if (!key) {
    const err = new Error("ONEINCH_API_KEY is required to use 1inch provider");
    err.code = "CONFIG_ERROR";
    err.statusCode = 500;
    throw err;
  }
  return key;
}

function headers() {
  const key = assertEnv();
  return { Authorization: `Bearer ${key}` };
}

function v() {
  return String(process.env.ONEINCH_API_VERSION || "v6.1").trim();
}

function mapError(status, data) {
  if (status === 429) return { code: "RATE_LIMITED", statusCode: 429, message: "swap provider rate limited" };
  if (status === 401 || status === 403) return { code: "AGGREGATOR_AUTH", statusCode: 502, message: "swap provider auth failed" };
  if (status >= 500) return { code: "AGGREGATOR_DOWN", statusCode: 502, message: "swap provider unavailable" };
  const msg = data?.description || data?.error || data?.message || `1inch error (${status})`;
  const err = { code: "AGGREGATOR_ERROR", statusCode: 502, message: String(msg) };
  if (String(msg).toLowerCase().includes("insufficient") || String(msg).toLowerCase().includes("no routes")) {
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
  const res = await fetch(url, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function quote({ chainId, sellToken, buyToken, sellAmount }) {
  const params = new URLSearchParams();
  params.set("src", sellToken);
  params.set("dst", buyToken);
  params.set("amount", String(sellAmount));
  const url = `${BASE}/swap/${v()}/${chainId}/quote?${params.toString()}`;
  const { res, data } = await withBreaker("1inch", () => getJson(url));
  if (!res.ok) throw makeError(mapError(res.status, data), data);
  return { provider: "1inch", raw: data };
}

// Note: 1inch /swap requires fromAddress. We use req.taker if present.
async function swap({ chainId, sellToken, buyToken, sellAmount, taker, slippagePercentage }) {
  const params = new URLSearchParams();
  params.set("src", sellToken);
  params.set("dst", buyToken);
  params.set("amount", String(sellAmount));
  if (taker) params.set("from", taker);
  if (typeof slippagePercentage === "number") params.set("slippage", String(slippagePercentage * 100));
  const url = `${BASE}/swap/${v()}/${chainId}/swap?${params.toString()}`;
  const { res, data } = await withBreaker("1inch", () => getJson(url));
  if (!res.ok) throw makeError(mapError(res.status, data), data);
  return { provider: "1inch", raw: data };
}

module.exports = { quote, swap };

