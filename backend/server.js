require("dotenv").config();

const express = require("express");

const referralService = require("./modules/referral/referral.service");
const marketsService = require("./modules/markets/markets.service");
const swapService = require("./modules/swap/swap.service");
const swapTelemetry = require("./modules/swap/swap.telemetry");
const feesService = require("./modules/fees/fees.service");
const pairsService = require("./modules/pairs/pairs.service");
const presaleService = require("./modules/presale/presale.service");
const matcherService = require("./modules/cex/matcher.service");
const { attachCexSseRoute } = require("./modules/cex/cex.stream");
const cexTransfers = require("./modules/cex/cex.transfers");
const cexOnchain = require("./modules/cex/cex.onchain");
const cexLiquidity = require("./modules/cex/cex.liquidity");
const stakingService = require("./modules/staking/staking.service");
const launchpadService = require("./modules/launchpad/launchpad.service");
const liqMiningService = require("./modules/incentives/liqMining.service");
const govSignalService = require("./modules/governance/govSignal.service");
const marginService = require("./modules/margin/margin.service");
const tokenPresets = require("./modules/tokens/tokens.presets");
const listingsService = require("./modules/listings/listings.service");
const p2pService = require("./modules/p2p/p2p.service");
const { registerAdminRoutes, requireAdminApiKey } = require("../admin");
const { publicConfig: cexPublicConfig } = require("./modules/cex/cex.config");
const { issueNonce, consumeNonce } = require("./modules/auth/auth.nonce");
const { buildLoginMessage, recoverAddress } = require("./modules/auth/auth.web3");
const {
  COOKIE_NAME,
  createSession,
  destroySession,
  cookieOptions,
  clearCookieOptions,
} = require("./modules/auth/auth.session");
const { getOrCreateUserByAddress } = require("./modules/users/users.model");
const { prisma, disconnect } = require("./lib/prisma");
const { logDexEnvSummary, logDexPairActivationDbSummary } = require("./lib/dexPairsFromEnv");
const { toPublicError } = require("./lib/publicErrors");
const routabilityPrefetch = require("./modules/swap0x/routability.prefetch");
const dexPairActivationService = require("./modules/dex/dexPairActivation.service");
const adminOpsService = require("./modules/adminOps/adminOps.service");
const blogService = require("./modules/blog/blog.service");
const ambassadorService = require("./modules/ambassador/ambassador.service");
const referralLedger = require("./modules/referral/referral.ledger");
const activityService = require("./modules/activity/activity.service");
const referralEngine = require("./modules/referral/referral.engine");
const { startUnlockEngine } = require("./modules/unlock/unlock.engine");
const { sessionMiddleware } = require("./middleware/session");
const {
  createCors,
  securityHeaders,
  authLimiter,
  swapQuoteLimiter,
  swapExecuteLimiter,
  referralLimiter,
  cexWriteLimiter,
  listingApplyLimiter,
} = require("./middleware/security");
const {
  lidexModeMiddleware,
  requireLidexMode,
  requireDexMode,
  requireCexMode,
} = require("./middleware/lidexMode");

const port = process.env.PORT || 4000;
const app = express();

if (String(process.env.TRUST_PROXY || "").trim() === "1") {
  app.set("trust proxy", 1);
}

let stopCexDepositPoller = () => {};
let stopUnlockEngine = () => {};
let stopRoutabilityPrefetch = () => {};

app.use(securityHeaders);
app.use(createCors());
app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware());
app.use("/v1", lidexModeMiddleware);

// Record lightweight wallet activity for anti-bot + unlock heuristics.
// This also opportunistically re-evaluates pending referrals tied to the current wallet.
app.use((req, res, next) => {
  if (req.user?.id && req.user?.address) {
    void activityService
      .record({ user: req.user, activityType: "login" })
      .then(() => referralEngine.validatePendingReferralsForWallet({ walletAddress: req.user.address }))
      .catch(() => {});
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "lidex-backend", ts: Date.now() });
});

// Public blog (no Lidex mode required)
app.get("/v1/blog/categories", async (req, res) => {
  try {
    const result = await blogService.listCategoriesPublic();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "blog categories failed" });
  }
});

app.get("/v1/blog/posts", async (req, res) => {
  try {
    const result = await blogService.listPostsPublic(req.query || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "blog posts list failed" });
  }
});

app.get("/v1/blog/posts/:slug", async (req, res) => {
  try {
    const result = await blogService.getPostBySlugWithRelatedPublic(req.params.slug);
    if (!result.ok) return res.status(404).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "blog post failed" });
  }
});

function requireSessionUser(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ ok: false, error: "not authenticated" });
  next();
}

/** Public: map ambassador username → wallet ref code for ?ref= */
app.get("/v1/ambassador/resolve/:username", async (req, res) => {
  try {
    const result = await ambassadorService.resolveUsername(req.params.username);
    if (!result.ok) return res.status(404).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "ambassador resolve failed" });
  }
});

app.get("/v1/ambassador/leaderboard", referralLimiter, requireLidexMode, async (req, res) => {
  try {
    const result = await ambassadorService.leaderboard({ month: req.query?.month });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "ambassador leaderboard failed" });
  }
});

app.post("/v1/ambassador/apply", referralLimiter, requireLidexMode, requireSessionUser, async (req, res) => {
  try {
    const result = await ambassadorService.apply({ user: req.user, body: req.body || {} });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "ambassador apply failed" });
  }
});

app.get("/v1/ambassador/me", referralLimiter, requireLidexMode, requireSessionUser, async (req, res) => {
  try {
    const result = await ambassadorService.me({ user: req.user });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "ambassador me failed" });
  }
});

// Phase 1 foundation — Auth (wallet-signature login)
app.post("/v1/auth/nonce", authLimiter, (req, res) => {
  const address = req.body?.address;
  const chainId = req.body?.chainId;
  if (typeof address !== "string" || !address.startsWith("0x")) {
    return res.status(400).json({ ok: false, error: "address is required" });
  }
  if (typeof chainId !== "number") {
    return res.status(400).json({ ok: false, error: "chainId is required" });
  }
  const nonce = issueNonce(address);
  const message = buildLoginMessage({ address, chainId, nonce });
  return res.json({ ok: true, nonce, message });
});

app.post("/v1/auth/verify", authLimiter, async (req, res) => {
  try {
    const { address, chainId, nonce, signature } = req.body || {};
    if (typeof address !== "string" || typeof signature !== "string" || typeof nonce !== "string" || typeof chainId !== "number") {
      return res.status(400).json({ ok: false, error: "address, chainId, nonce, signature are required" });
    }
    const ok = consumeNonce(address, nonce);
    if (!ok) return res.status(400).json({ ok: false, error: "invalid or expired nonce" });

    const message = buildLoginMessage({ address, chainId, nonce });
    const recovered = recoverAddress({ message, signature });
    if (recovered !== String(address).toLowerCase()) {
      return res.status(401).json({ ok: false, error: "signature does not match address" });
    }

    const user = await getOrCreateUserByAddress(address);
    const sid = await createSession(user.address);
    res.cookie(COOKIE_NAME, sid, cookieOptions());
    return res.json({ ok: true, user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "verify failed" });
  }
});

app.post("/v1/auth/logout", async (req, res) => {
  const sid = req.cookies?.[COOKIE_NAME];
  await destroySession(sid);
  res.clearCookie(COOKIE_NAME, clearCookieOptions());
  res.json({ ok: true });
});

app.get("/v1/me", requireLidexMode, (req, res) => {
  res.json({ ok: true, user: req.user || null });
});

// Runtime token presets (Phase 6): allow env overrides without frontend redeploy.
app.get("/v1/tokens/presets", requireLidexMode, async (req, res) => {
  try {
    const chainId = req.query?.chainId;
    const result = tokenPresets.presetsForChain(chainId);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "UNSUPPORTED_CHAIN") return res.status(400).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "token presets failed" });
  }
});

// Phase 7 — token listing ecosystem (public apply + public token registry)
app.post("/v1/listings/apply", listingApplyLimiter, requireLidexMode, async (req, res) => {
  try {
    const result = await listingsService.apply({ body: req.body || {} });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "listing apply failed" });
  }
});

app.get("/v1/tokens/list", requireLidexMode, async (req, res) => {
  try {
    const result = await listingsService.listTokens({ chainId: req.query?.chainId });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "token list failed" });
  }
});

registerAdminRoutes(app, {
  requireAdminApiKey,
  prisma,
  adminOpsService,
  listingsService,
  dexPairActivationService,
  launchpadService,
  liqMiningService,
  govSignalService,
  blogService,
  ambassadorService,
});

// Phase 2 — LDX launch (config + on-chain buy params for the web UI; txs are signed in the browser)
app.get("/v1/presale", requireLidexMode, async (req, res) => {
  try {
    const result = await presaleService.overview();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "presale overview failed" });
  }
});

// Phase 1 (MVP) — Referral
app.get("/v1/referral/link", referralLimiter, requireLidexMode, async (req, res) => {
  try {
    const result =
      req?.user?.id && req?.user?.address
        ? await referralService.link({ user: req.user })
        : await referralService.linkForAddress({ address: req.query?.address || req?.user?.address });
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "referral link failed" });
  }
});

app.get("/v1/referral/stats", referralLimiter, requireLidexMode, async (req, res) => {
  const result = await referralService.stats({ user: req.user || null });
  res.json(result);
});

app.get("/v1/referral/users", referralLimiter, requireLidexMode, async (req, res) => {
  if (!req.user?.address) return res.status(401).json({ ok: false, error: "not authenticated" });
  const result = await referralService.users({ user: req.user });
  res.json(result);
});

app.post("/v1/referral/attach", referralLimiter, requireLidexMode, requireSessionUser, async (req, res) => {
  try {
    const result = await referralService.attach({ user: req.user, refCode: req.body?.refCode });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "referral attach failed" });
  }
});

app.post("/v1/referral/ledger/confirm", referralLimiter, requireLidexMode, requireDexMode, async (req, res) => {
  if (!req.user?.address) return res.status(401).json({ ok: false, error: "not authenticated" });
  const id = req.body?.id;
  const txHash = req.body?.txHash;
  if (typeof id !== "string" || typeof txHash !== "string") {
    return res.status(400).json({ ok: false, error: "id and txHash are required" });
  }
  const a = String(req.user.address).toLowerCase();
  const list = await referralLedger.listByUserAddress(a);
  const existing = list.find((e) => e.id === id);
  if (!existing) return res.status(404).json({ ok: false, error: "ledger entry not found" });
  // Phase 1: allow either participant to confirm.
  if (existing.parentAddress !== a && existing.childAddress !== a) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  const entry = await referralLedger.confirm({ id, txHash });
  return res.json({ ok: true, entry });
});

app.post("/v1/referral/ledger/mark-paid", referralLimiter, requireLidexMode, async (req, res) => {
  if (!req.user?.address) return res.status(401).json({ ok: false, error: "not authenticated" });
  const id = req.body?.id;
  const payoutTxHash = req.body?.payoutTxHash || null;
  if (typeof id !== "string") return res.status(400).json({ ok: false, error: "id is required" });
  const a = String(req.user.address).toLowerCase();
  // Phase 1: only parent (earner) can mark as paid.
  const list = await referralLedger.listByUserAddress(a);
  const existing = list.find((e) => e.id === id && e.parentAddress === a);
  if (!existing) return res.status(404).json({ ok: false, error: "ledger entry not found" });
  const entry = await referralLedger.markPaid({ id, payoutTxHash });
  return res.json({ ok: true, entry });
});

// Phase 1 (MVP) — Fees
app.get("/v1/fees/summary", requireLidexMode, requireCexMode, (req, res) => {
  res.json({ ok: true, summary: feesService.summary(), treasury: feesService.treasuryTotals() });
});

app.get("/v1/fees/events", requireLidexMode, requireCexMode, (req, res) => {
  const limit = Number(req.query?.limit || 50);
  res.json({ ok: true, events: feesService.list({ limit }) });
});

// Phase 1 (MVP) — Markets / Pairs
app.get("/v1/markets/pairs", requireLidexMode, async (req, res) => {
  const result = await marketsService.pairs({ lidexMode: req.lidexMode });
  res.json(result);
});

app.get("/v1/markets/stats", requireLidexMode, async (req, res) => {
  const result = await marketsService.stats();
  res.json(result);
});

app.get("/v1/markets/candles", requireLidexMode, requireCexMode, async (req, res) => {
  const symbol = req.query?.symbol;
  const interval = req.query?.interval;
  const limit = req.query?.limit;
  const result = await marketsService.candles({ symbol, interval, limit });
  if (result.ok === false) return res.status(400).json(result);
  res.json(result);
});

app.get("/v1/pairs", requireLidexMode, requireCexMode, async (req, res) => {
  const result = await pairsService.list();
  res.json(result);
});

function requireCexUser(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ ok: false, error: "not authenticated" });
  next();
}

function requireAuthUser(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ ok: false, error: "not authenticated" });
  next();
}

// Phase 5 — LDX staking (CEX balances)
app.get("/v1/staking/pools", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await stakingService.pools();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "staking pools failed" });
  }
});

app.get("/v1/staking/positions", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await stakingService.positions({ user: req.user || null });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "staking positions failed" });
  }
});

app.post("/v1/staking/stake", cexWriteLimiter, requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await stakingService.stake({ body: req.body || {}, user: req.user || null });
    if (result.ok === false) {
      const code = result.code;
      if (code === "BAD_AMOUNT" || code === "INSUFFICIENT_BALANCE" || code === "UNAUTHENTICATED") {
        return res.status(400).json(result);
      }
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "stake failed" });
  }
});

app.post("/v1/staking/unstake", cexWriteLimiter, requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await stakingService.unstake({ body: req.body || {}, user: req.user || null });
    if (result.ok === false) {
      const code = result.code;
      if (code === "BAD_AMOUNT" || code === "INSUFFICIENT_STAKE" || code === "UNAUTHENTICATED") {
        return res.status(400).json(result);
      }
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "unstake failed" });
  }
});

// Phase 8 — launchpad (CEX custodial fixed-price; pay quote asset, credit offer asset)
app.get("/v1/launchpad/sales", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await launchpadService.listSalesPublic();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "launchpad list failed" });
  }
});

app.get("/v1/launchpad/sales/:slugOrId", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await launchpadService.getSale(req.params.slugOrId);
    if (result.ok === false) {
      const code = result.code;
      const st =
        code === "NOT_FOUND" ? 404 : code === "DISABLED" ? 503 : code === "BAD_REQUEST" ? 400 : 400;
      return res.status(st).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "launchpad sale failed" });
  }
});

app.get("/v1/launchpad/allocations", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await launchpadService.myAllocations(req.user);
    if (result.ok === false) {
      const code = result.code;
      if (code === "UNAUTHENTICATED") return res.status(401).json(result);
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "launchpad allocations failed" });
  }
});

app.post("/v1/launchpad/participate", cexWriteLimiter, requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await launchpadService.participate({ user: req.user, body: req.body || {} });
    if (result.ok === false) {
      const code = result.code;
      if (code === "UNAUTHENTICATED") return res.status(401).json(result);
      if (code === "DISABLED") return res.status(503).json(result);
      if (code === "NOT_FOUND") return res.status(404).json(result);
      if (code === "INSUFFICIENT_BALANCE" || code === "TIER_REQUIRED") return res.status(403).json(result);
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "launchpad participate failed" });
  }
});

// Phase 8 — governance signaling (CEX-weighted polls; non-binding)
app.get("/v1/governance/signals", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await govSignalService.listSignalsPublic();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "governance signals list failed" });
  }
});

app.get("/v1/governance/signals/:slugOrId", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await govSignalService.getSignalPublic(req.params.slugOrId, req.user?.id || null);
    if (result.ok === false) {
      const code = result.code === "NOT_FOUND" ? 404 : 400;
      return res.status(code).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "governance signal failed" });
  }
});

app.post(
  "/v1/governance/signals/:slugOrId/vote",
  cexWriteLimiter,
  requireLidexMode,
  requireCexMode,
  requireCexUser,
  async (req, res) => {
    try {
      const result = await govSignalService.castVote(req.user.id, req.params.slugOrId, req.body?.choice);
      if (result.ok === false) {
        const code = result.code;
        let st = 400;
        if (code === "NOT_FOUND") st = 404;
        else if (code === "DISABLED" || code === "ZERO_POWER") st = 403;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "governance vote failed" });
    }
  }
);

// Phase 3 — single-pair internal matcher (no 0x)
app.get("/v1/cex/config", requireLidexMode, requireCexMode, (req, res) => {
  let onchain;
  try {
    onchain = cexOnchain.publicInfo();
  } catch {
    onchain = { enabled: false };
  }
  const cfg = cexPublicConfig();
  res.json({
    ...cfg,
    onchain,
    liquidity: {
      readApi: true,
      writesEnabled: cfg.features?.liquidityWritesEnabled === true,
      poolMatchingEnabled: cfg.features?.poolMatchingEnabled === true,
      liqMiningEnabled: cfg.features?.liqMiningEnabled === true,
      governanceSignalEnabled: cfg.features?.governanceSignalEnabled === true,
    },
    margin: marginService.publicConfigExtras(),
  });
});

app.get("/v1/cex/margin/positions", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await marginService.listPositions(req.user.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "margin positions failed" });
  }
});

app.post("/v1/cex/margin/open", cexWriteLimiter, requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await marginService.openPosition(req.user, req.body || {});
    if (result.ok === false) {
      const c = result.code;
      if (c === "DISABLED") return res.status(403).json(result);
      if (c === "UNAUTHENTICATED") return res.status(401).json(result);
      if (c === "INSUFFICIENT_COLLATERAL" || c === "BAD_REQUEST" || c === "LIMIT" || c === "NO_MARK_PRICE") {
        return res.status(400).json(result);
      }
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "margin open failed" });
  }
});

app.post("/v1/cex/margin/close", cexWriteLimiter, requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await marginService.closePosition(req.user, String(req.body?.positionId || ""));
    if (result.ok === false) {
      const c = result.code;
      if (c === "DISABLED") return res.status(403).json(result);
      if (c === "NOT_FOUND") return res.status(404).json(result);
      if (c === "NO_MARK_PRICE" || c === "BAD_REQUEST") return res.status(400).json(result);
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "margin close failed" });
  }
});

app.get("/v1/cex/liquidity/pools", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await cexLiquidity.listPools();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "liquidity pools failed" });
  }
});

app.get("/v1/cex/liquidity/pools/:id", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await cexLiquidity.getPool(req.params.id);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "liquidity pool failed" });
  }
});

app.get("/v1/cex/liquidity/mining-campaigns", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await liqMiningService.listCampaignsPublic();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "liquidity mining campaigns failed" });
  }
});

app.get("/v1/cex/liquidity/positions", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await cexLiquidity.listUserPositions(req.user.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "liquidity positions failed" });
  }
});

app.post("/v1/cex/liquidity/rewards/claim", cexWriteLimiter, requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const poolId = String(req.body?.poolId || "").trim();
    if (!poolId) {
      return res.status(400).json({ ok: false, error: "poolId is required" });
    }
    const result = await cexLiquidity.claimRewards(req.user.id, poolId);
    if (result.ok === false) {
      const code = result.code;
      if (code === "NO_REWARD_CONFIG" || code === "NO_POSITION" || code === "NOTHING_TO_CLAIM") {
        return res.status(400).json(result);
      }
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "liquidity rewards claim failed" });
  }
});

app.post("/v1/cex/liquidity/add", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const poolId = String(req.body?.poolId || "");
    const baseAmount = String(req.body?.baseAmount ?? "");
    const quoteAmount = String(req.body?.quoteAmount ?? "");
    const result = await cexLiquidity.addLiquidity(req.user.id, poolId, baseAmount, quoteAmount);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "LIQUIDITY_DISABLED") return res.status(403).json({ ok: false, error: e.message, code });
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    if (
      code === "BAD_AMOUNT" ||
      code === "BAD_REQUEST" ||
      code === "BAD_POOL" ||
      code === "ZERO_LIQUIDITY_MINT" ||
      code === "INSUFFICIENT_BASE" ||
      code === "INSUFFICIENT_QUOTE" ||
      code === "POOL_INCONSISTENT"
    ) {
      return res.status(400).json({ ok: false, error: e.message, code });
    }
    res.status(500).json({ ok: false, error: e?.message || "liquidity add failed" });
  }
});

app.post("/v1/cex/liquidity/remove", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const poolId = String(req.body?.poolId || "");
    const lpShares = String(req.body?.lpShares ?? "");
    const result = await cexLiquidity.removeLiquidity(req.user.id, poolId, lpShares);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "LIQUIDITY_DISABLED") return res.status(403).json({ ok: false, error: e.message, code });
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    if (
      code === "BAD_AMOUNT" ||
      code === "BAD_REQUEST" ||
      code === "INSUFFICIENT_LP" ||
      code === "POOL_INCONSISTENT"
    ) {
      return res.status(400).json({ ok: false, error: e.message, code });
    }
    res.status(500).json({ ok: false, error: e?.message || "liquidity remove failed" });
  }
});

app.get("/v1/cex/stats", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await matcherService.getStats();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "cex stats failed" });
  }
});

app.get("/v1/cex/orderbook", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const result = await matcherService.getOrderbook();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "orderbook failed" });
  }
});

attachCexSseRoute(app, { matcherService });

app.get("/v1/cex/trades", requireLidexMode, requireCexMode, async (req, res) => {
  try {
    const mineQ = req.query?.mine;
    const mine = mineQ === "1" || String(mineQ || "").toLowerCase() === "true";
    const raw = parseInt(String(req.query?.limit ?? "40"), 10);
    const limit = Number.isFinite(raw) ? raw : 40;
    const cursor = req.query?.cursor != null ? String(req.query.cursor) : undefined;
    const pageOpts = { limit, cursor };

    if (mine) {
      if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: "not authenticated" });
      }
      const r = await matcherService.listUserTrades(req.user.id, pageOpts);
      return res.json(r);
    }
    const r = await matcherService.listRecentTrades(pageOpts);
    res.json(r);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_CURSOR") {
      return res.status(400).json({ ok: false, error: e.message, code });
    }
    res.status(500).json({ ok: false, error: e?.message || "trades failed" });
  }
});

app.get("/v1/cex/balances", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await matcherService.listBalances(req.user.id);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "balances failed" });
  }
});

app.get("/v1/cex/orders", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const raw = parseInt(String(req.query?.limit ?? "50"), 10);
    const limit = Number.isFinite(raw) ? raw : 50;
    const cursor = req.query?.cursor != null ? String(req.query.cursor) : undefined;
    const status = req.query?.status != null ? String(req.query.status) : undefined;
    const orderType = req.query?.orderType != null ? String(req.query.orderType) : undefined;
    const bookOnly =
      req.query?.bookOnly === true ||
      String(req.query?.bookOnly || "").toLowerCase() === "true" ||
      String(req.query?.bookOnly || "").toLowerCase() === "1";
    const r = await matcherService.listUserOrders(req.user.id, { limit, cursor, status, orderType, bookOnly });
    res.json(r);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_CURSOR") {
      return res.status(400).json({ ok: false, error: e.message, code });
    }
    res.status(500).json({ ok: false, error: e?.message || "orders failed" });
  }
});

app.post("/v1/cex/orders", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const result = await matcherService.placeOrder({
      userId: req.user.id,
      side: req.body?.side,
      orderType: req.body?.orderType,
      price: String(req.body?.price ?? ""),
      quantity: String(req.body?.quantity ?? ""),
      quoteBudget: String(req.body?.quoteBudget ?? ""),
      stopPrice: String(req.body?.stopPrice ?? ""),
      postOnly: req.body?.postOnly === true || String(req.body?.postOnly).toLowerCase() === "true",
      clientOrderId: req.body?.clientOrderId,
    });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (
      code === "INSUFFICIENT_QUOTE" ||
      code === "INSUFFICIENT_BASE" ||
      code === "BAD_SIDE" ||
      code === "BAD_AMOUNT" ||
      code === "BELOW_MIN_NOTIONAL" ||
      code === "BELOW_MIN_QTY" ||
      code === "NO_LIQUIDITY" ||
      code === "POST_ONLY_WOULD_TAKE" ||
      code === "BAD_REQUEST"
    ) {
      return res.status(400).json({ ok: false, error: e.message, code });
    }
    if (code === "CLIENT_ORDER_ID_DUPLICATE") {
      return res.status(409).json({ ok: false, error: e.message, code });
    }
    res.status(500).json({ ok: false, error: e?.message || "place order failed" });
  }
});

app.post("/v1/cex/orders/cancel-all", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const includePendingStop = !(
      req.body?.includePendingStop === false ||
      String(req.body?.includePendingStop || "").toLowerCase() === "false"
    );
    const result = await matcherService.cancelAllUserOrders({
      userId: req.user.id,
      includePendingStop,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "cancel all failed" });
  }
});

app.delete("/v1/cex/orders/:id", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const result = await matcherService.cancelOrder({ userId: req.user.id, orderId: req.params.id });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "cancel failed" });
  }
});

app.post("/v1/cex/dev/fund", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const asset = String(req.body?.asset || "");
    const amount = String(req.body?.amount || "");
    const row = await matcherService.devCredit(req.user.id, asset, amount);
    res.json({ ok: true, balance: row });
  } catch (e) {
    const code = e?.code;
    if (code === "FORBIDDEN") return res.status(403).json({ ok: false, error: e.message });
    if (code === "BAD_AMOUNT") return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "fund failed" });
  }
});

app.post("/v1/cex/deposit", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const asset = String(req.body?.asset || "");
    const amount = String(req.body?.amount || "");
    const balance = await cexTransfers.depositSimulated(req.user.id, asset, amount);
    res.json({ ok: true, balance });
  } catch (e) {
    const code = e?.code;
    if (code === "FORBIDDEN") return res.status(403).json({ ok: false, error: e.message });
    if (code === "BAD_ASSET" || code === "BAD_AMOUNT") return res.status(400).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "deposit failed" });
  }
});

app.post("/v1/cex/withdraw", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const asset = String(req.body?.asset || "");
    const amount = String(req.body?.amount || "");
    const balance = await cexTransfers.withdrawSimulated(req.user.id, asset, amount);
    res.json({ ok: true, balance });
  } catch (e) {
    const code = e?.code;
    if (code === "FORBIDDEN") return res.status(403).json({ ok: false, error: e.message });
    if (code === "INSUFFICIENT_FUNDS") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "BAD_ASSET" || code === "BAD_AMOUNT") return res.status(400).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "withdraw failed" });
  }
});

app.get("/v1/cex/onchain/deposit/status", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const txHash = String(req.query?.txHash || "");
    const result = await cexOnchain.getDepositStatusForUser(req.user.id, txHash);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "ONCHAIN_DISABLED") return res.status(403).json({ ok: false, error: e.message, code });
    if (code === "MISCONFIGURED") return res.status(503).json({ ok: false, error: e.message, code });
    if (code === "BAD_TX_HASH") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "deposit status failed" });
  }
});

app.post("/v1/cex/onchain/deposit/confirm", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const txHash = String(req.body?.txHash || "");
    const result = await cexOnchain.confirmDeposit(req.user.id, txHash);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "ONCHAIN_DISABLED") return res.status(403).json({ ok: false, error: e.message, code });
    if (code === "MISCONFIGURED") return res.status(503).json({ ok: false, error: e.message, code });
    if (code === "BAD_TX_HASH") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "NOT_CONFIRMED") return res.status(409).json({ ok: false, error: e.message, code });
    if (code === "TX_NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    if (code === "NO_MATCHING_TRANSFER") return res.status(422).json({ ok: false, error: e.message, code });
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "deposit confirm failed" });
  }
});

app.post("/v1/cex/onchain/withdraw", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const asset = String(req.body?.asset || "");
    const amount = String(req.body?.amount || "");
    const result = await cexOnchain.withdrawToUserWallet(req.user.id, asset, amount);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "ONCHAIN_DISABLED" || code === "WITHDRAW_DISABLED") {
      return res.status(403).json({ ok: false, error: e.message, code });
    }
    if (code === "MISCONFIGURED") return res.status(503).json({ ok: false, error: e.message, code });
    if (code === "BAD_ASSET" || code === "BAD_AMOUNT") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "INSUFFICIENT_FUNDS") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    if (code === "CHAIN_SEND_FAILED") return res.status(502).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "withdraw failed" });
  }
});

app.get("/v1/cex/onchain/withdraw/challenge", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await cexOnchain.issueWithdrawChallenge(req.user.id);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "ONCHAIN_DISABLED" || code === "WITHDRAW_DISABLED") {
      return res.status(403).json({ ok: false, error: e.message, code });
    }
    if (code === "MISCONFIGURED") return res.status(503).json({ ok: false, error: e.message, code });
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "challenge failed" });
  }
});

app.post("/v1/cex/onchain/withdraw/signed", requireLidexMode, requireCexMode, requireCexUser, cexWriteLimiter, async (req, res) => {
  try {
    const result = await cexOnchain.withdrawToSignedAddress(req.user.id, {
      asset: req.body?.asset,
      amount: req.body?.amount,
      toAddress: req.body?.toAddress,
      message: req.body?.message,
      signature: req.body?.signature,
      withdrawNonce: req.body?.withdrawNonce,
    });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "ONCHAIN_DISABLED" || code === "WITHDRAW_DISABLED") {
      return res.status(403).json({ ok: false, error: e.message, code });
    }
    if (code === "MISCONFIGURED") return res.status(503).json({ ok: false, error: e.message, code });
    if (code === "BAD_REQUEST" || code === "BAD_ASSET" || code === "BAD_AMOUNT" || code === "BAD_ADDRESS") {
      return res.status(400).json({ ok: false, error: e.message, code });
    }
    if (code === "BAD_NONCE" || code === "BAD_MESSAGE") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "BAD_SIGNATURE") return res.status(401).json({ ok: false, error: e.message, code });
    if (code === "FORBIDDEN_DESTINATION") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "INSUFFICIENT_FUNDS") return res.status(400).json({ ok: false, error: e.message, code });
    if (code === "NOT_FOUND") return res.status(404).json({ ok: false, error: e.message, code });
    if (code === "CHAIN_SEND_FAILED") return res.status(502).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "signed withdraw failed" });
  }
});

app.get("/v1/cex/onchain/withdrawals", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const limit = Number(req.query?.limit ?? 20);
    const result = await cexOnchain.listWithdrawals(req.user.id, limit);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "list withdrawals failed" });
  }
});

app.get("/v1/cex/onchain/deposits", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const limit = Number(req.query?.limit ?? 20);
    const result = await cexOnchain.listOnchainDeposits(req.user.id, limit);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "list deposits failed" });
  }
});

app.get("/v1/cex/onchain/treasury", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const result = await cexOnchain.getTreasurySnapshot();
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "ONCHAIN_DISABLED") return res.status(403).json({ ok: false, error: e.message, code });
    if (code === "MISCONFIGURED") return res.status(503).json({ ok: false, error: e.message, code });
    res.status(500).json({ ok: false, error: e?.message || "treasury snapshot failed" });
  }
});

app.get("/v1/cex/ledger", requireLidexMode, requireCexMode, requireCexUser, async (req, res) => {
  try {
    const limit = Number(req.query?.limit ?? 50);
    const result = await cexTransfers.listLedger(req.user.id, limit);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "ledger failed" });
  }
});

// Phase 1 (MVP) — Swap via 0x (quote + tx payload)
app.post("/v1/swap/quote", requireLidexMode, requireDexMode, swapQuoteLimiter, async (req, res) => {
  try {
    const result = await swapService.quote({ body: req.body || {} });
    void swapTelemetry.record({
      kind: "quote",
      provider: result?.summary?.provider || "0x",
      chainId: Number(req.body?.chainId || 0),
      sellToken: String(req.body?.sellToken || ""),
      buyToken: String(req.body?.buyToken || ""),
      sellAmount: String(req.body?.sellAmount || ""),
      buyAmount: result?.summary?.buyAmount || null,
      ok: true,
      code: null,
      message: null,
    });
    res.json(result);
  } catch (e) {
    const out = toPublicError(e, { fallbackMessage: "swap quote failed" });
    void swapTelemetry.record({
      kind: "quote",
      provider: "unknown",
      chainId: Number(req.body?.chainId || 0),
      sellToken: String(req.body?.sellToken || ""),
      buyToken: String(req.body?.buyToken || ""),
      sellAmount: String(req.body?.sellAmount || ""),
      buyAmount: null,
      ok: false,
      code: out.body?.code || "INTERNAL_ERROR",
      message: out.body?.message || null,
    });
    res.status(out.statusCode).json(out.body);
  }
});

// Phase 1 (MVP) — Swap execute helper (returns tx fields to sign)
app.post("/v1/swap/execute", requireLidexMode, requireDexMode, swapExecuteLimiter, async (req, res) => {
  try {
    const result = await swapService.execute({ body: req.body || {}, user: req.user || null });
    void swapTelemetry.record({
      kind: "execute",
      provider: result?.summary?.provider || "0x",
      chainId: Number(req.body?.chainId || 0),
      sellToken: String(req.body?.sellToken || ""),
      buyToken: String(req.body?.buyToken || ""),
      sellAmount: String(req.body?.sellAmount || ""),
      buyAmount: result?.summary?.buyAmount || null,
      ok: true,
      code: null,
      message: null,
    });
    res.json(result);
  } catch (e) {
    const out = toPublicError(e, { fallbackMessage: "swap execute failed" });
    void swapTelemetry.record({
      kind: "execute",
      provider: "unknown",
      chainId: Number(req.body?.chainId || 0),
      sellToken: String(req.body?.sellToken || ""),
      buyToken: String(req.body?.buyToken || ""),
      sellAmount: String(req.body?.sellAmount || ""),
      buyAmount: null,
      ok: false,
      code: out.body?.code || "INTERNAL_ERROR",
      message: out.body?.message || null,
    });
    res.status(out.statusCode).json(out.body);
  }
});

// P2P — fiat ↔ crypto marketplace (wallet session; works in DEX or CEX mode)
app.get("/v1/p2p/ads", requireLidexMode, async (req, res) => {
  try {
    const result = await p2pService.listAds({ query: req.query || {} });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "p2p ads failed" });
  }
});

app.post("/v1/p2p/express/match", requireLidexMode, async (req, res) => {
  try {
    const result = await p2pService.expressMatch({ body: req.body || {} });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "express match failed" });
  }
});

app.post("/v1/p2p/ads", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.createAd({ user: req.user, body: req.body || {} });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "create ad failed" });
  }
});

app.get("/v1/p2p/ads/mine", requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.listMyAds({ user: req.user });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "list ads failed" });
  }
});

app.patch("/v1/p2p/ads/:id", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.updateAd({ user: req.user, adId: req.params.id, body: req.body || {} });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "update ad failed" });
  }
});

app.delete("/v1/p2p/ads/:id", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.deleteAd({ user: req.user, adId: req.params.id });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "delete ad failed" });
  }
});

app.post("/v1/p2p/orders", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.createOrder({ user: req.user, body: req.body || {} });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "create order failed" });
  }
});

app.get("/v1/p2p/orders", requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.listMyOrders({ user: req.user });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "list orders failed" });
  }
});

app.get("/v1/p2p/orders/:id", requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.getOrder({ user: req.user, orderId: req.params.id });
    if (result.ok === false) return res.status(404).json(result);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "order failed" });
  }
});

app.post("/v1/p2p/orders/:id/paid", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.markPaid({ user: req.user, orderId: req.params.id });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "mark paid failed" });
  }
});

app.post("/v1/p2p/orders/:id/confirm", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.confirmRelease({ user: req.user, orderId: req.params.id });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "confirm failed" });
  }
});

app.post("/v1/p2p/orders/:id/cancel", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.cancelOrder({ user: req.user, orderId: req.params.id });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "cancel failed" });
  }
});

app.get("/v1/p2p/orders/:id/messages", requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.listMessages({ user: req.user, orderId: req.params.id });
    if (result.ok === false) return res.status(404).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "messages failed" });
  }
});

app.post("/v1/p2p/orders/:id/messages", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.postMessage({ user: req.user, orderId: req.params.id, body: req.body || {} });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "post message failed" });
  }
});

app.get("/v1/p2p/payment-methods", requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.listPaymentMethods({ user: req.user });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "payment methods failed" });
  }
});

app.post("/v1/p2p/payment-methods", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.createPaymentMethod({ user: req.user, body: req.body || {} });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "create payment method failed" });
  }
});

app.delete("/v1/p2p/payment-methods/:id", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.deletePaymentMethod({ user: req.user, id: req.params.id });
    if (result.ok === false) return res.status(404).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "delete payment method failed" });
  }
});

app.post("/v1/p2p/merchant/apply", cexWriteLimiter, requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.applyMerchant({ user: req.user, body: req.body || {} });
    if (result.ok === false) return res.status(400).json(result);
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "BAD_REQUEST") return res.status(400).json({ ok: false, error: e.message });
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "merchant apply failed" });
  }
});

app.get("/v1/p2p/merchant/status", requireLidexMode, requireAuthUser, async (req, res) => {
  try {
    const result = await p2pService.merchantStatus({ user: req.user });
    res.json(result);
  } catch (e) {
    const code = e?.code;
    if (code === "UNAUTHORIZED") return res.status(401).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: e?.message || "merchant status failed" });
  }
});

async function start() {
  // Bind all interfaces — required on Render, Railway, Fly, etc. (not only localhost).
  app.listen(Number(port), "0.0.0.0", () => {
    logDexEnvSummary();
    stopRoutabilityPrefetch = routabilityPrefetch.start();
    stopCexDepositPoller = cexOnchain.startDepositPollerIfEnabled();
    stopUnlockEngine = startUnlockEngine({ intervalMs: Number(process.env.UNLOCK_ENGINE_INTERVAL_MS || 60 * 60 * 1000) });
    // eslint-disable-next-line no-console
    console.log(`Lidex backend listening on 0.0.0.0:${port}`);
  });

  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await prisma.$connect();
      break;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`DB connect failed (attempt ${attempt}/${maxAttempts}):`, e?.message || e);
      await new Promise((r) => setTimeout(r, Math.min(30000, 1500 * attempt)));
    }
  }

  try {
    await matcherService.hydrateFromDb();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("CEX matcher hydrate skipped (tables missing or DB unreachable):", e?.message || e);
  }
  try {
    await logDexPairActivationDbSummary();
  } catch {
    /* non-fatal */
  }
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`${signal} received, closing…`);
  stopCexDepositPoller();
  stopUnlockEngine();
  stopRoutabilityPrefetch();
  try {
    await disconnect();
  } finally {
    process.exit(0);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

