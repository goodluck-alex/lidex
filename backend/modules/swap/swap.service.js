/**
 * DEX swap orchestration — external liquidity via 0x only (`requireDexMode` routes).
 * Do not use this module for CEX / internal matcher fills; see docs/architecture.md §3.
 */
const swap0xService = require("../swap0x/swap0x.service");
const feesService = require("../fees/fees.service");
const referralLedger = require("../referral/referral.ledger");
const referralModel = require("../referral/referral.model");
const { getOrCreateUserByAddress } = require("../users/users.model");
const stakingService = require("../staking/staking.service");
const activityService = require("../activity/activity.service");
const referralEngine = require("../referral/referral.engine");
const { normalizeQuoteSummary } = require("./swap.normalize");
const quoteCache = require("./swap.quoteCache");
const providersService = require("../swapProviders/providers.service");
const { DEFAULT_TAKER } = require("../swap0x/swap0x.service");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TOKENS } = require("@lidex/shared");
const { ethers } = require("ethers");

function numEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function dexDefaultSlippagePct() {
  // 1% default
  return clamp(numEnv("DEX_DEFAULT_SLIPPAGE_PCT", 0.01), 0, 1);
}

function dexMaxSlippagePct() {
  // 3% default cap
  return clamp(numEnv("DEX_MAX_SLIPPAGE_PCT", 0.03), 0, 1);
}

function normalizeSlippagePercentage(body) {
  const b = body && typeof body === "object" ? body : {};
  let sp = b.slippagePercentage;
  // Allow slippageBps (basis points) as input too.
  if (sp == null && b.slippageBps != null) {
    const bps = Number(b.slippageBps);
    if (!Number.isFinite(bps)) {
      const err = new Error("slippageBps must be a number");
      err.code = "BAD_REQUEST";
      err.statusCode = 400;
      throw err;
    }
    sp = bps / 10000;
  }

  if (sp == null) sp = dexDefaultSlippagePct();

  const n = Number(sp);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    const err = new Error("slippagePercentage must be a number between 0 and 1");
    err.code = "BAD_REQUEST";
    err.statusCode = 400;
    throw err;
  }

  const max = dexMaxSlippagePct();
  if (n > max) {
    const err = new Error(`slippagePercentage too high (max ${max})`);
    err.code = "SLIPPAGE_TOO_HIGH";
    err.statusCode = 400;
    err.details = { maxSlippagePercentage: max };
    throw err;
  }

  return { ...b, slippagePercentage: n };
}

function assertSupportedChainAndTokens(body) {
  const chainId = Number(body?.chainId);
  if (!Number.isFinite(chainId)) {
    const err = new Error("chainId is required");
    err.code = "BAD_REQUEST";
    err.statusCode = 400;
    throw err;
  }
  if (!TOKENS?.phase1?.[chainId]) {
    const err = new Error("unsupported chainId");
    err.code = "UNSUPPORTED_CHAIN";
    err.statusCode = 400;
    err.details = { chainId };
    throw err;
  }
  const sellToken = String(body?.sellToken || "").trim();
  const buyToken = String(body?.buyToken || "").trim();
  if (!sellToken || !buyToken) {
    const err = new Error("sellToken and buyToken are required");
    err.code = "BAD_REQUEST";
    err.statusCode = 400;
    throw err;
  }
  try {
    ethers.getAddress(sellToken);
    ethers.getAddress(buyToken);
  } catch {
    const err = new Error("sellToken and buyToken must be valid addresses");
    err.code = "INVALID_TOKEN";
    err.statusCode = 400;
    throw err;
  }
}

function addWarnings(summary, req) {
  const out = { ...summary, warnings: Array.isArray(summary?.warnings) ? [...summary.warnings] : [] };
  if (typeof req?.slippagePercentage === "number" && req.slippagePercentage >= 0.02) {
    out.warnings.push({ code: "HIGH_SLIPPAGE", message: "High slippage tolerance may cause worse execution" });
  }
  return out;
}

function assertRoutableQuote(q) {
  if (q && q.liquidityAvailable === false) {
    const err = new Error(
      "No on-chain liquidity route for this pair yet. Add AMM liquidity (e.g. PancakeSwap on BSC) so 0x can aggregate it."
    );
    err.code = "NO_LIQUIDITY";
    err.statusCode = 422;
    err.details = { liquidityAvailable: false };
    throw err;
  }
}

function assertExecutableQuote(q) {
  const tx = q?.transaction;
  if (!tx?.to || !tx?.data) {
    const err = new Error("swap provider did not return a valid transaction payload");
    err.code = "BAD_QUOTE";
    err.statusCode = 502;
    err.details = { hasTransaction: Boolean(tx) };
    throw err;
  }
}

function assertSaneQuote(q) {
  // For UI safety: ensure we can always show an estimated output.
  const buy = q?.buyAmount ?? q?.minBuyAmount;
  if (buy == null) {
    const err = new Error("swap provider did not return an output amount");
    err.code = "BAD_QUOTE";
    err.statusCode = 502;
    err.details = { hasBuyAmount: q?.buyAmount != null, hasMinBuyAmount: q?.minBuyAmount != null };
    throw err;
  }
  try {
    const n = BigInt(String(buy));
    if (n <= 0n) {
      const err = new Error("swap provider returned a non-positive output amount");
      err.code = "BAD_QUOTE";
      err.statusCode = 502;
      err.details = { buyAmount: String(buy) };
      throw err;
    }
  } catch {
    const err = new Error("swap provider returned an invalid output amount");
    err.code = "BAD_QUOTE";
    err.statusCode = 502;
    err.details = { buyAmount: String(buy) };
    throw err;
  }

  if (!q?.allowanceTarget) {
    const err = new Error("swap provider did not return allowanceTarget");
    err.code = "BAD_QUOTE";
    err.statusCode = 502;
    err.details = {};
    throw err;
  }
}

async function quote({ body }) {
  const safeBody = normalizeSlippagePercentage(body || {});
  assertSupportedChainAndTokens(safeBody);
  const fee = feesService.getSwapFeeConfig();
  const normReq = quoteCache.normalizeQuoteRequest(safeBody, { fee });
  // Use provider fallback chain (default: 0x only)
  const req = { ...safeBody, taker: safeBody.taker || DEFAULT_TAKER };
  const r = await providersService.indicativeWithFallback(req);
  const q = r?.out?.raw;
  assertRoutableQuote(q);
  assertSaneQuote(q);
  const ids = quoteCache.put({ normReq, quote: q });
  const summary = addWarnings({ ...normalizeQuoteSummary(q), provider: r.provider }, req);
  return {
    ok: true,
    quote: q,
    summary,
    ...(ids?.quoteId ? { quoteId: ids.quoteId } : {}),
    ...(ids?.requestHash ? { requestHash: ids.requestHash } : {}),
  };
}

async function execute({ body, user }) {
  const safeBody = normalizeSlippagePercentage(body || {});
  assertSupportedChainAndTokens(safeBody);
  let q = null;
  const quoteId = safeBody?.quoteId;
  const requestHash = safeBody?.requestHash;
  const fee = feesService.getSwapFeeConfig();
  if (typeof quoteId === "string" && quoteId.trim()) {
    const hit = quoteCache.get(quoteId);
    if (hit) {
      const normReq = quoteCache.normalizeQuoteRequest(safeBody, { fee });
      quoteCache.assertSameRequest(hit.normReq, normReq);
      q = hit.quote;
    }
  }
  if (!q && typeof requestHash === "string" && requestHash.trim()) {
    const hit = quoteCache.getByHash(String(requestHash).trim().toLowerCase());
    if (hit) {
      const normReq = quoteCache.normalizeQuoteRequest(safeBody, { fee });
      quoteCache.assertSameRequest(hit.normReq, normReq);
      q = hit.quote;
    }
  }
  if (!q) {
    const req = { ...safeBody, taker: safeBody.taker || DEFAULT_TAKER };
    const r = await providersService.firmWithFallback(req);
    q = r?.out?.raw;
  }
  assertRoutableQuote(q);
  assertSaneQuote(q);
  assertExecutableQuote(q);

  // fee tracking (Phase 1+)
  if (q?.fees?.integratorFee?.token && q?.fees?.integratorFee?.amount) {
    feesService.recordSwapIntegratorFee({
      id: q.zid || `${Date.now()}`,
      chainId: safeBody?.chainId,
      userAddress: user?.address || null,
      feeToken: q.fees.integratorFee.token,
      feeAmount: q.fees.integratorFee.amount
    });
    // treasury credit (in-memory accounting)
    feesService.creditTreasury({
      id: q.zid || `${Date.now()}`,
      chainId: safeBody?.chainId,
      token: q.fees.integratorFee.token,
      amount: q.fees.integratorFee.amount
    });
  }

  // tx fields
  const tx = q?.transaction
    ? {
        to: q.transaction.to,
        data: q.transaction.data,
        value: q.transaction.value,
        gas: q.transaction.gas,
        gasPrice: q.transaction.gasPrice
      }
    : null;

  // referral reward ledger (Phase 1)
  let referralReward = null;
  if (user?.address && user?.referralParent && q?.fees?.integratorFee?.amount) {
    const tiers = referralModel.emptyStats().tiers;
    const parentAddress = String(user.referralParent).toLowerCase();
    const childAddress = String(user.address).toLowerCase();
    const integratorFeeAmount = BigInt(q.fees.integratorFee.amount);
    const parentUser = await getOrCreateUserByAddress(parentAddress);
    const boostBps = await stakingService.effectiveReferralBoostBpsForUser(parentUser.id);
    const level1Bps = Math.min(10000, Math.max(0, Math.round((tiers.level1 || 0) * 10000)));
    const shareBps = Math.min(10000, level1Bps + boostBps);
    const rewardAmount = (integratorFeeAmount * BigInt(shareBps)) / 10000n;

    referralReward = await referralLedger.add({
      id: q.zid || `${Date.now()}`,
      chainId: safeBody?.chainId,
      parentAddress,
      childAddress,
      feeToken: q.fees.integratorFee.token,
      integratorFeeAmount: q.fees.integratorFee.amount,
      rewardAmount: rewardAmount.toString(),
      amountUsd: 0,
      status: "pending",
      payoutStatus: "unpaid",
    });
  }

  // Activity engine: any successful quote/execute request indicates intent; treat as swap activity.
  if (user?.id && user?.address) {
    void activityService
      .record({ user, activityType: "swap", amount: q?.buyAmount || null })
      .then(() => referralEngine.validatePendingReferralsForWallet({ walletAddress: user.address }))
      .catch(() => {});
  }

  return {
    ok: true,
    tx,
    allowanceTarget: q?.allowanceTarget,
    quote: q,
    summary: addWarnings(normalizeQuoteSummary(q), { ...safeBody, taker: safeBody.taker || DEFAULT_TAKER }),
    referralReward,
  };
}

module.exports = { quote, execute };

