const BASE_URL = "https://api.0x.org";
// 0x requires a non-zero taker (> 0x...ffff). Use a harmless placeholder until a real wallet address is provided.
const DEFAULT_TAKER = "0x0000000000000000000000000000000000010000";
const feesService = require("../fees/fees.service");
const { withBreaker } = require("../../lib/circuitBreaker");

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

function quoteCacheMs() {
  return intEnv("SWAP_QUOTE_CACHE_MS", 15_000);
}

function httpTimeoutMs() {
  return intEnv("OX_HTTP_TIMEOUT_MS", 8_000);
}

function httpRetries() {
  return Math.max(0, intEnv("OX_HTTP_RETRIES", 2));
}

function getHeaders() {
  const headers = {
    "0x-version": "v2"
  };
  // Accept either env var name.
  // Preferred: OX_API_KEY (as in 0x, but without starting with a digit)
  const apiKey = process.env.OX_API_KEY || process.env.ZEROX_API_KEY;
  if (apiKey) headers["0x-api-key"] = apiKey;
  return headers;
}

function makeError({ code, message, statusCode, details }) {
  const err = new Error(message || "swap provider error");
  err.code = code || "AGGREGATOR_ERROR";
  err.statusCode = statusCode || 502;
  if (details != null) err.details = details;
  return err;
}

function assertString(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw makeError({ code: "BAD_REQUEST", message: `${name} is required`, statusCode: 400 });
  }
}

function assertNumber(name, value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw makeError({ code: "BAD_REQUEST", message: `${name} must be a number`, statusCode: 400 });
  }
}

async function fetchJsonWithTimeout(url, opts) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), httpTimeoutMs());
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (e) {
    const aborted = e?.name === "AbortError";
    throw makeError({
      code: aborted ? "AGGREGATOR_TIMEOUT" : "AGGREGATOR_DOWN",
      message: aborted ? "swap provider timeout" : "swap provider unreachable",
      statusCode: 502,
      details: { url, cause: e?.message || String(e) },
    });
  } finally {
    clearTimeout(t);
  }
}

function map0xHttpError({ status, data }) {
  const msg = data?.reason || data?.message || `0x quote failed (${status})`;

  if (status === 429) return { code: "RATE_LIMITED", statusCode: 429, message: "swap provider rate limited" };
  if (status === 401 || status === 403) return { code: "AGGREGATOR_AUTH", statusCode: 502, message: "swap provider auth failed" };
  if (status >= 500) return { code: "AGGREGATOR_DOWN", statusCode: 502, message: "swap provider unavailable" };

  const reasonStr = String(data?.reason || "").toUpperCase();
  const msgStr = String(msg || "").toUpperCase();
  if (reasonStr.includes("INSUFFICIENT") || msgStr.includes("INSUFFICIENT") || msgStr.includes("NO ROUTE")) {
    return { code: "NO_LIQUIDITY", statusCode: 422, message: "no liquidity route found" };
  }
  return { code: "AGGREGATOR_ERROR", statusCode: 502, message: msg };
}

/** @type {Map<string, { expiresAt: number, value: any }>} */
const quoteCache = new Map();

function cacheGet(key) {
  const hit = quoteCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    quoteCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  const ttl = quoteCacheMs();
  if (ttl <= 0) return;
  quoteCache.set(key, { expiresAt: Date.now() + ttl, value });
}

async function quote({ chainId, sellToken, buyToken, sellAmount, taker, slippagePercentage }) {
  assertNumber("chainId", chainId);
  assertString("sellToken", sellToken);
  assertString("buyToken", buyToken);
  assertString("sellAmount", sellAmount);

  const { swapFeeRecipient, swapFeeBps, swapFeeToken } = feesService.getSwapFeeConfig();
  const cacheKey = JSON.stringify({
    chainId,
    sellToken: String(sellToken).toLowerCase(),
    buyToken: String(buyToken).toLowerCase(),
    sellAmount: String(sellAmount),
    taker: String(taker || DEFAULT_TAKER).toLowerCase(),
    slippagePercentage: typeof slippagePercentage === "number" ? slippagePercentage : null,
    swapFeeRecipient: swapFeeRecipient ? String(swapFeeRecipient).toLowerCase() : null,
    swapFeeBps: swapFeeBps != null ? String(swapFeeBps) : null,
    swapFeeToken: swapFeeToken != null ? String(swapFeeToken) : null,
  });
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();
  params.set("chainId", String(chainId));
  params.set("sellToken", sellToken);
  params.set("buyToken", buyToken);
  params.set("sellAmount", sellAmount);
  params.set("taker", taker || DEFAULT_TAKER);
  if (typeof slippagePercentage === "number") params.set("slippagePercentage", String(slippagePercentage));

  // Optional platform fee (Phase 1+)
  // 0x Swap API v2 parameters:
  // - swapFeeRecipient: address
  // - swapFeeBps: fee in basis points (0.5% = 50, 1% = 100)
  // - swapFeeToken: must be buyToken or sellToken
  if (swapFeeRecipient && swapFeeBps) {
    params.set("swapFeeRecipient", swapFeeRecipient);
    params.set("swapFeeBps", swapFeeBps);
    if (swapFeeToken === "buyToken") params.set("swapFeeToken", buyToken);
    else if (swapFeeToken === "sellToken") params.set("swapFeeToken", sellToken);
    else if (typeof swapFeeToken === "string" && swapFeeToken.length > 0) params.set("swapFeeToken", swapFeeToken);
  }

  const url = `${BASE_URL}/swap/allowance-holder/quote?${params.toString()}`;
  let lastErr = null;
  const attempts = 1 + httpRetries();
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const { res, data } = await withBreaker("0x", () => fetchJsonWithTimeout(url, { method: "GET", headers: getHeaders() }));
      if (!res.ok) {
        const mapped = map0xHttpError({ status: res.status, data });
        throw makeError({ ...mapped, details: data });
      }
      cacheSet(cacheKey, data);
      return data;
    } catch (e) {
      lastErr = e;
      const sc = Number(e?.statusCode || 0);
      const retryable =
        e?.code === "AGGREGATOR_TIMEOUT" ||
        e?.code === "AGGREGATOR_DOWN" ||
        e?.code === "RATE_LIMITED" ||
        (sc >= 500 && sc < 600);
      if (!retryable || attempt === attempts) throw e;
      // basic backoff
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  // should be unreachable
  throw lastErr || makeError({ code: "AGGREGATOR_ERROR", message: "swap provider failed" });
}

async function price({ chainId, sellToken, buyToken, sellAmount, taker, slippagePercentage }) {
  assertNumber("chainId", chainId);
  assertString("sellToken", sellToken);
  assertString("buyToken", buyToken);
  assertString("sellAmount", sellAmount);

  const params = new URLSearchParams();
  params.set("chainId", String(chainId));
  params.set("sellToken", sellToken);
  params.set("buyToken", buyToken);
  params.set("sellAmount", sellAmount);
  // taker is optional on /price but include it when present
  if (taker) params.set("taker", taker);
  if (typeof slippagePercentage === "number") params.set("slippagePercentage", String(slippagePercentage));

  const { swapFeeRecipient, swapFeeBps, swapFeeToken } = feesService.getSwapFeeConfig();
  if (swapFeeRecipient && swapFeeBps) {
    params.set("swapFeeRecipient", swapFeeRecipient);
    params.set("swapFeeBps", swapFeeBps);
    if (swapFeeToken === "buyToken") params.set("swapFeeToken", buyToken);
    else if (swapFeeToken === "sellToken") params.set("swapFeeToken", sellToken);
    else if (typeof swapFeeToken === "string" && swapFeeToken.length > 0) params.set("swapFeeToken", swapFeeToken);
  }

  const url = `${BASE_URL}/swap/allowance-holder/price?${params.toString()}`;
  const { res, data } = await withBreaker("0x", () => fetchJsonWithTimeout(url, { method: "GET", headers: getHeaders() }));
  if (!res.ok) {
    const mapped = map0xHttpError({ status: res.status, data });
    throw makeError({ ...mapped, details: data });
  }
  return data;
}

module.exports = { quote, price, DEFAULT_TAKER };

