require("dotenv").config();

const express = require("express");

const referralService = require("./modules/referral/referral.service");
const marketsService = require("./modules/markets/markets.service");
const swapService = require("./modules/swap/swap.service");
const feesService = require("./modules/fees/fees.service");
const pairsService = require("./modules/pairs/pairs.service");
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
const { sessionMiddleware } = require("./middleware/session");
const {
  createCors,
  securityHeaders,
  authLimiter,
  swapQuoteLimiter,
  swapExecuteLimiter,
} = require("./middleware/security");
const {
  lidexModeMiddleware,
  requireLidexMode,
  requireDexMode,
  requireCexMode,
} = require("./middleware/lidexMode");

const port = process.env.PORT || 4000;
const app = express();

app.use(securityHeaders);
app.use(createCors());
app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware());
app.use("/v1", lidexModeMiddleware);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "lidex-backend", ts: Date.now() });
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

app.post("/v1/auth/verify", authLimiter, (req, res) => {
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

    const user = getOrCreateUserByAddress(address);
    const sid = createSession(user.address);
    res.cookie(COOKIE_NAME, sid, cookieOptions());
    return res.json({ ok: true, user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "verify failed" });
  }
});

app.post("/v1/auth/logout", (req, res) => {
  const sid = req.cookies?.[COOKIE_NAME];
  destroySession(sid);
  res.clearCookie(COOKIE_NAME, clearCookieOptions());
  res.json({ ok: true });
});

app.get("/v1/me", requireLidexMode, (req, res) => {
  res.json({ ok: true, user: req.user || null });
});

// Phase 1 (MVP) — Referral
app.get("/v1/referral/link", requireLidexMode, async (req, res) => {
  // If authenticated, return user-specific link; otherwise guest.
  const result = await referralService.link({ user: req.user || null });
  res.json(result);
});

app.get("/v1/referral/stats", requireLidexMode, async (req, res) => {
  const result = await referralService.stats({ user: req.user || null });
  res.json(result);
});

app.post("/v1/referral/attach", requireLidexMode, async (req, res) => {
  const result = await referralService.attach({ user: req.user || null, refCode: req.body?.refCode });
  if (result.ok === false) return res.status(400).json(result);
  res.json(result);
});

app.post("/v1/referral/ledger/confirm", requireLidexMode, requireDexMode, (req, res) => {
  if (!req.user?.address) return res.status(401).json({ ok: false, error: "not authenticated" });
  const id = req.body?.id;
  const txHash = req.body?.txHash;
  if (typeof id !== "string" || typeof txHash !== "string") {
    return res.status(400).json({ ok: false, error: "id and txHash are required" });
  }
  const a = String(req.user.address).toLowerCase();
  const existing = require("./modules/referral/referral.ledger").listByUserAddress(a).find((e) => e.id === id);
  if (!existing) return res.status(404).json({ ok: false, error: "ledger entry not found" });
  // Phase 1: allow either participant to confirm.
  if (existing.parentAddress !== a && existing.childAddress !== a) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }
  const entry = require("./modules/referral/referral.ledger").confirm({ id, txHash });
  return res.json({ ok: true, entry });
});

app.post("/v1/referral/ledger/mark-paid", requireLidexMode, (req, res) => {
  if (!req.user?.address) return res.status(401).json({ ok: false, error: "not authenticated" });
  const id = req.body?.id;
  const payoutTxHash = req.body?.payoutTxHash || null;
  if (typeof id !== "string") return res.status(400).json({ ok: false, error: "id is required" });
  const a = String(req.user.address).toLowerCase();
  // Phase 1: only parent (earner) can mark as paid.
  const existing = require("./modules/referral/referral.ledger").listByUserAddress(a).find((e) => e.id === id && e.parentAddress === a);
  if (!existing) return res.status(404).json({ ok: false, error: "ledger entry not found" });
  const entry = require("./modules/referral/referral.ledger").markPaid({ id, payoutTxHash });
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
  const result = await marketsService.pairs();
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

// Phase 1 (MVP) — Swap via 0x (quote + tx payload)
app.post("/v1/swap/quote", requireLidexMode, requireDexMode, swapQuoteLimiter, async (req, res) => {
  try {
    const result = await swapService.quote({ body: req.body || {} });
    res.json(result);
  } catch (e) {
    res.status(e?.statusCode || 500).json({ ok: false, error: e?.message || "swap quote failed", details: e?.details });
  }
});

// Phase 1 (MVP) — Swap execute helper (returns tx fields to sign)
app.post("/v1/swap/execute", requireLidexMode, requireDexMode, swapExecuteLimiter, async (req, res) => {
  try {
    const result = await swapService.execute({ body: req.body || {}, user: req.user || null });
    res.json(result);
  } catch (e) {
    res.status(e?.statusCode || 500).json({ ok: false, error: e?.message || "swap execute failed", details: e?.details });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Lidex backend listening on :${port}`);
});

