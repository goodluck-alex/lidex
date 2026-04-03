const Decimal = require("decimal.js");
const { prisma } = require("../../lib/prisma");

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

const BASE_BPS = 10000;
/** Hard cap 10× base emission. */
const MAX_MULTIPLIER_BPS = 100000;

function d(x) {
  return new Decimal(x || 0);
}

function liqMiningEnabled() {
  return String(process.env.LIQ_MINING_ENABLED || "true").toLowerCase() !== "false";
}

function normalizePoolSymbol(s) {
  return String(s || "").trim().toUpperCase();
}

/**
 * @param {string} poolSymbol
 * @param {number} tMs
 * @param {{ status: string; poolSymbol: string | null; multiplierBps: number; startsAt: Date | null; endsAt: Date | null }[]} campaigns
 */
function multiplierBpsAt(poolSymbol, tMs, campaigns) {
  const sym = normalizePoolSymbol(poolSymbol);
  let m = BASE_BPS;
  for (const c of campaigns) {
    if (c.status !== "active") continue;
    if (c.poolSymbol != null && normalizePoolSymbol(c.poolSymbol) !== sym) continue;
    const st = c.startsAt ? c.startsAt.getTime() : -Infinity;
    const en = c.endsAt ? c.endsAt.getTime() : Infinity;
    if (tMs < st || tMs >= en) continue;
    const b = Number(c.multiplierBps);
    if (Number.isFinite(b) && b > m) m = Math.min(Math.trunc(b), MAX_MULTIPLIER_BPS);
  }
  return m;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function loadCampaignsOverlappingTx(tx, poolSymbol, last, now) {
  if (!liqMiningEnabled()) return [];
  const sym = normalizePoolSymbol(poolSymbol);
  return tx.liqMiningCampaign.findMany({
    where: {
      status: "active",
      OR: [{ poolSymbol: null }, { poolSymbol: sym }],
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: last } }] },
      ],
    },
  });
}

/**
 * Piecewise-constant accrual for [last, now] given overlapping campaigns.
 */
function accrualDeltaAccPerLp({ rate, S, poolSymbol, last, now, campaigns }) {
  if (S.lte(0) || rate.lte(0)) return d(0);
  const lastMs = last.getTime();
  const nowMs = now.getTime();
  if (nowMs <= lastMs) return d(0);

  const bounds = new Set([lastMs, nowMs]);
  for (const c of campaigns) {
    if (c.startsAt) {
      const ms = c.startsAt.getTime();
      if (ms > lastMs && ms < nowMs) bounds.add(ms);
    }
    if (c.endsAt) {
      const ms = c.endsAt.getTime();
      if (ms > lastMs && ms < nowMs) bounds.add(ms);
    }
  }

  const sorted = [...bounds].sort((a, b) => a - b);
  let total = d(0);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const sec = Math.max(0, Math.floor((b - a) / 1000));
    if (sec <= 0) continue;
    const span = b - a;
    const sample = span <= 1 ? a : a + Math.min(500, Math.floor(span / 2));
    const mult = multiplierBpsAt(poolSymbol, sample, campaigns);
    const piece = rate.times(mult).div(BASE_BPS).times(sec).div(S);
    total = total.plus(piece);
  }
  return total.toDecimalPlaces(40, Decimal.ROUND_DOWN);
}

async function currentMultiplierBpsBySymbols(symbols) {
  const uniq = [...new Set(symbols.map(normalizePoolSymbol).filter(Boolean))];
  const out = {};
  for (const s of uniq) out[s] = BASE_BPS;
  if (!liqMiningEnabled() || !uniq.length) return out;

  const now = new Date();
  const rows = await prisma.liqMiningCampaign.findMany({
    where: {
      status: "active",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
  });
  for (const sym of uniq) {
    out[sym] = multiplierBpsAt(sym, now.getTime(), rows);
  }
  return out;
}

async function listCampaignsPublic() {
  if (!liqMiningEnabled()) return { ok: true, enabled: false, campaigns: [] };
  const now = new Date();
  const rows = await prisma.liqMiningCampaign.findMany({
    where: {
      status: "active",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
  });
  return {
    ok: true,
    enabled: true,
    campaigns: rows.map(serializeCampaign),
  };
}

function serializeCampaign(c) {
  return {
    id: c.id,
    poolSymbol: c.poolSymbol,
    label: c.label,
    multiplierBps: c.multiplierBps,
    status: c.status,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
  };
}

async function adminListCampaigns() {
  if (!liqMiningEnabled()) return { ok: true, enabled: false, campaigns: [] };
  const rows = await prisma.liqMiningCampaign.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return { ok: true, enabled: true, campaigns: rows.map(serializeCampaign) };
}

/**
 * @param {Record<string, unknown>} body
 */
async function adminCreateCampaign(body) {
  if (!liqMiningEnabled()) return { ok: false, error: "liquidity mining disabled", code: "DISABLED" };
  const label = body.label != null ? String(body.label).trim().slice(0, 200) : null;
  const poolSymbolRaw = body.poolSymbol;
  const poolSymbol =
    poolSymbolRaw === null || poolSymbolRaw === undefined || String(poolSymbolRaw).trim() === ""
      ? null
      : normalizePoolSymbol(poolSymbolRaw);
  const mult = Math.trunc(Number(body.multiplierBps));
  if (!Number.isFinite(mult) || mult < BASE_BPS || mult > MAX_MULTIPLIER_BPS) {
    return {
      ok: false,
      error: `multiplierBps must be ${BASE_BPS}..${MAX_MULTIPLIER_BPS} (basis points on base rate)`,
      code: "BAD_REQUEST",
    };
  }

  if (poolSymbol) {
    const pool = await prisma.cexLiquidityPool.findFirst({ where: { symbol: poolSymbol } });
    if (!pool) return { ok: false, error: "poolSymbol must match an existing CEX liquidity pool", code: "BAD_REQUEST" };
  }

  let startsAt = null;
  let endsAt = null;
  if (body.startsAt) {
    const t = new Date(String(body.startsAt));
    if (!Number.isFinite(t.getTime())) return { ok: false, error: "invalid startsAt", code: "BAD_REQUEST" };
    startsAt = t;
  }
  if (body.endsAt) {
    const t = new Date(String(body.endsAt));
    if (!Number.isFinite(t.getTime())) return { ok: false, error: "invalid endsAt", code: "BAD_REQUEST" };
    endsAt = t;
  }

  const status = String(body.status || "active").trim().toLowerCase();
  if (!["active", "paused"].includes(status)) {
    return { ok: false, error: "status must be active or paused", code: "BAD_REQUEST" };
  }

  const row = await prisma.liqMiningCampaign.create({
    data: {
      poolSymbol,
      label,
      multiplierBps: mult,
      status,
      startsAt,
      endsAt,
    },
  });
  return { ok: true, campaign: serializeCampaign(row) };
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
async function adminPatchCampaign(id, body) {
  if (!liqMiningEnabled()) return { ok: false, error: "liquidity mining disabled", code: "DISABLED" };
  const rid = String(id || "").trim();
  if (!rid) return { ok: false, error: "id required", code: "BAD_REQUEST" };

  const data = {};
  if (body.label !== undefined) data.label = body.label ? String(body.label).trim().slice(0, 200) : null;
  if (body.status != null) {
    const s = String(body.status).trim().toLowerCase();
    if (!["active", "paused"].includes(s)) return { ok: false, error: "invalid status", code: "BAD_REQUEST" };
    data.status = s;
  }
  if (body.multiplierBps != null) {
    const mult = Math.trunc(Number(body.multiplierBps));
    if (!Number.isFinite(mult) || mult < BASE_BPS || mult > MAX_MULTIPLIER_BPS) {
      return { ok: false, error: "invalid multiplierBps", code: "BAD_REQUEST" };
    }
    data.multiplierBps = mult;
  }
  if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
  if (Object.keys(data).length === 0) return { ok: false, error: "no updates", code: "BAD_REQUEST" };

  try {
    const row = await prisma.liqMiningCampaign.update({ where: { id: rid }, data });
    return { ok: true, campaign: serializeCampaign(row) };
  } catch (e) {
    if (e.code === "P2025") return { ok: false, error: "not found", code: "NOT_FOUND" };
    throw e;
  }
}

module.exports = {
  liqMiningEnabled,
  BASE_BPS,
  MAX_MULTIPLIER_BPS,
  loadCampaignsOverlappingTx,
  accrualDeltaAccPerLp,
  currentMultiplierBpsBySymbols,
  listCampaignsPublic,
  adminListCampaigns,
  adminCreateCampaign,
  adminPatchCampaign,
  multiplierBpsAt,
};
