const BASE_URL = "https://api.0x.org";
// 0x requires a non-zero taker (> 0x...ffff). Use a harmless placeholder until a real wallet address is provided.
const DEFAULT_TAKER = "0x0000000000000000000000000000000000010000";
const feesService = require("../fees/fees.service");

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

function assertString(name, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    const err = new Error(`${name} is required`);
    err.statusCode = 400;
    throw err;
  }
}

function assertNumber(name, value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    const err = new Error(`${name} must be a number`);
    err.statusCode = 400;
    throw err;
  }
}

async function quote({ chainId, sellToken, buyToken, sellAmount, taker, slippagePercentage }) {
  assertNumber("chainId", chainId);
  assertString("sellToken", sellToken);
  assertString("buyToken", buyToken);
  assertString("sellAmount", sellAmount);

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
  const { swapFeeRecipient, swapFeeBps, swapFeeToken } = feesService.getSwapFeeConfig();

  if (swapFeeRecipient && swapFeeBps) {
    params.set("swapFeeRecipient", swapFeeRecipient);
    params.set("swapFeeBps", swapFeeBps);
    if (swapFeeToken === "buyToken") params.set("swapFeeToken", buyToken);
    else if (swapFeeToken === "sellToken") params.set("swapFeeToken", sellToken);
    else if (typeof swapFeeToken === "string" && swapFeeToken.length > 0) params.set("swapFeeToken", swapFeeToken);
  }

  const url = `${BASE_URL}/swap/allowance-holder/quote?${params.toString()}`;
  const res = await fetch(url, { method: "GET", headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.reason || data?.message || `0x quote failed (${res.status})`);
    err.statusCode = res.status;
    err.details = data;
    throw err;
  }

  return data;
}

module.exports = { quote };

