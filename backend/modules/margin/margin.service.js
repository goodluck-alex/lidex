const Decimal = require("decimal.js");
const { prisma } = require("../../lib/prisma");
const { getBalanceRow } = require("../cex/cex.balances");
const { CEX_MATCHER_SYMBOL, CEX_QUOTE_ASSET } = require("../cex/cex.config");
const { takerFeeOnSellQuote } = require("../cex/cex.fees");
const matcherService = require("../cex/matcher.service");
const stakingService = require("../staking/staking.service");

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

function d(x) {
  return new Decimal(x || 0);
}

function marginEnabled() {
  return String(process.env.MARGIN_ENABLED || "").toLowerCase() === "true";
}

function maxLeverage() {
  const n = parseInt(process.env.MARGIN_MAX_LEVERAGE || "5", 10);
  if (!Number.isFinite(n) || n < 2) return 5;
  return Math.min(50, Math.max(2, n));
}

function minLeverage() {
  return 2;
}

function maintenanceBps() {
  const n = parseInt(process.env.MARGIN_MAINTENANCE_BPS || "100", 10);
  if (!Number.isFinite(n) || n < 1) return 100;
  return Math.min(2000, Math.max(1, n));
}

function minCollateralQuote() {
  const n = parseInt(process.env.MARGIN_MIN_COLLATERAL_QUOTE || "5", 10);
  if (!Number.isFinite(n) || n < 1) return d(5);
  return d(n);
}

function liquidationExtraBps() {
  const n = parseInt(process.env.MARGIN_LIQUIDATION_EXTRA_FEE_BPS || "0", 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(500, n);
}

async function getMarkPriceDecimal() {
  const stats = await matcherService.getStats();
  if (stats.lastTrade?.price) {
    const px = d(stats.lastTrade.price);
    if (px.gt(0)) return px;
  }
  const bb = stats.bestBid != null ? d(stats.bestBid) : null;
  const ba = stats.bestAsk != null ? d(stats.bestAsk) : null;
  if (bb && ba && bb.gt(0) && ba.gt(0)) return bb.plus(ba).div(2);
  if (bb && bb.gt(0)) return bb;
  if (ba && ba.gt(0)) return ba;
  const err = new Error("no mark price — need at least one trade or book quote");
  err.code = "NO_MARK_PRICE";
  throw err;
}

/**
 * @param {{ side: string; collateralQuote: string; sizeBase: string; entryPrice: string }} pos
 * @param {Decimal} mark
 */
function unrealizedPnlQuote(pos, mark) {
  const qty = d(pos.sizeBase);
  const entry = d(pos.entryPrice);
  const side = String(pos.side).toLowerCase();
  if (side === "long") return qty.times(mark.minus(entry));
  if (side === "short") return qty.times(entry.minus(mark));
  return d(0);
}

function equityQuote(pos, mark) {
  return d(pos.collateralQuote).plus(unrealizedPnlQuote(pos, mark));
}

function maintenanceRequirementQuote(pos, mark) {
  const notional = d(pos.sizeBase).times(mark);
  return notional.times(maintenanceBps()).div(10000);
}

function shouldLiquidate(pos, mark) {
  if (pos.status !== "open") return false;
  const eq = equityQuote(pos, mark);
  const mm = maintenanceRequirementQuote(pos, mark);
  return eq.lt(mm);
}

function publicConfigExtras() {
  return {
    marginEnabled: marginEnabled(),
    marginMaxLeverage: maxLeverage(),
    marginMinLeverage: minLeverage(),
    marginMaintenanceBps: maintenanceBps(),
    marginMinCollateralQuote: minCollateralQuote().toString(),
    marginQuoteAsset: CEX_QUOTE_ASSET,
    marginSymbol: CEX_MATCHER_SYMBOL,
  };
}

/**
 * Liquidate any underwater positions (all users). Safe to call frequently.
 */
async function sweepLiquidations() {
  if (!marginEnabled()) return { ok: true, liquidated: 0 };
  let mark;
  try {
    mark = await getMarkPriceDecimal();
  } catch {
    return { ok: true, liquidated: 0, skip: "no_mark" };
  }

  const opens = await prisma.cexMarginPosition.findMany({
    where: { symbol: CEX_MATCHER_SYMBOL, status: "open" },
  });
  let n = 0;
  for (const pos of opens) {
    if (!shouldLiquidate(pos, mark)) {
      await prisma.cexMarginPosition.update({
        where: { id: pos.id },
        data: { lastMarkPrice: mark.toString() },
      });
      continue;
    }
    await closePositionAsSystem(pos, mark, "LIQUIDATED");
    n += 1;
  }
  return { ok: true, liquidated: n };
}

/**
 * @param {import('@prisma/client').CexMarginPosition} pos
 * @param {Decimal} mark
 * @param {string} reason
 */
async function closePositionAsSystem(pos, mark, reason) {
  await prisma.$transaction(async (tx) => {
    const row = await tx.cexMarginPosition.findFirst({
      where: { id: pos.id, userId: pos.userId, status: "open" },
    });
    if (!row) return;

    const feeBps = await stakingService.effectiveTakerFeeBpsForUser(row.userId);
    const pnlRow = unrealizedPnlQuote(row, mark);
    const notional = d(row.sizeBase).times(mark);
    let fee = takerFeeOnSellQuote(mark.toString(), row.sizeBase, feeBps);
    const exB = liquidationExtraBps();
    if (exB > 0 && reason === "LIQUIDATED") {
      fee = fee.plus(notional.times(exB).div(10000));
    }
    let credit = d(row.collateralQuote).plus(pnlRow).minus(fee);
    if (credit.lt(0)) credit = d(0);

    const qRow = await getBalanceRow(tx, row.userId, CEX_QUOTE_ASSET);
    await tx.cexBalance.update({
      where: { id: qRow.id },
      data: { available: d(qRow.available).plus(credit).toString() },
    });

    await tx.cexLedgerEntry.create({
      data: {
        userId: row.userId,
        kind: reason === "LIQUIDATED" ? "margin_liquidation" : "margin_close",
        asset: CEX_QUOTE_ASSET,
        deltaAvail: credit.toString(),
      },
    });

    await tx.cexMarginPosition.update({
      where: { id: row.id },
      data: {
        status: reason === "LIQUIDATED" ? "liquidated" : "closed",
        lastMarkPrice: mark.toString(),
        realizedPnlQuote: pnlRow.toString(),
        closedAt: new Date(),
        closeReason: reason,
      },
    });
  });
}

async function listPositions(userId) {
  if (!marginEnabled()) return { ok: true, enabled: false, positions: [], ...publicConfigExtras() };
  await sweepLiquidations();
  const mark = await getMarkPriceDecimal().catch(() => null);
  const rows = await prisma.cexMarginPosition.findMany({
    where: { userId, symbol: CEX_MATCHER_SYMBOL },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const positions = rows.map((p) => {
    const m = mark || (p.lastMarkPrice ? d(p.lastMarkPrice) : d(0));
    const u = m.gt(0) ? unrealizedPnlQuote(p, m) : d(0);
    const eq = m.gt(0) ? equityQuote(p, m) : d(p.collateralQuote);
    const mm = m.gt(0) ? maintenanceRequirementQuote(p, m) : d(0);
    return {
      id: p.id,
      symbol: p.symbol,
      side: p.side,
      leverage: p.leverage,
      collateralQuote: p.collateralQuote,
      sizeBase: p.sizeBase,
      entryPrice: p.entryPrice,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      closedAt: p.closedAt ? p.closedAt.toISOString() : null,
      realizedPnlQuote: p.realizedPnlQuote,
      closeReason: p.closeReason,
      markPrice: m.gt(0) ? m.toString() : null,
      unrealizedPnlQuote: m.gt(0) ? u.toString() : null,
      equityQuote: m.gt(0) ? eq.toString() : null,
      maintenanceQuote: m.gt(0) ? mm.toString() : null,
      liquidatable: m.gt(0) && p.status === "open" ? shouldLiquidate(p, m) : false,
    };
  });
  return { ok: true, enabled: true, positions, ...publicConfigExtras() };
}

/**
 * @param {{ id: string }} user
 * @param {Record<string, unknown>} body
 */
async function openPosition(user, body) {
  if (!marginEnabled()) return { ok: false, error: "margin trading disabled", code: "DISABLED" };
  if (!user?.id) return { ok: false, error: "not authenticated", code: "UNAUTHENTICATED" };

  const sideRaw = String(body.side || "").toLowerCase();
  if (sideRaw !== "long" && sideRaw !== "short") {
    return { ok: false, error: "side must be long or short", code: "BAD_REQUEST" };
  }

  const lev = Math.trunc(Number(body.leverage));
  if (!Number.isFinite(lev) || lev < minLeverage() || lev > maxLeverage()) {
    return {
      ok: false,
      error: `leverage must be ${minLeverage()}..${maxLeverage()}`,
      code: "BAD_REQUEST",
    };
  }

  const collateral = d(body.collateralQuote);
  if (collateral.lt(minCollateralQuote())) {
    return {
      ok: false,
      error: `collateral must be at least ${minCollateralQuote().toString()} ${CEX_QUOTE_ASSET}`,
      code: "BAD_REQUEST",
    };
  }

  let mark;
  try {
    mark = await getMarkPriceDecimal();
  } catch (e) {
    const code = e.code === "NO_MARK_PRICE" ? "NO_MARK_PRICE" : "BAD_REQUEST";
    return { ok: false, error: e.message, code };
  }

  const notionalQuote = collateral.times(lev);
  const sizeBase = notionalQuote.div(mark);
  if (sizeBase.lte(0)) {
    return { ok: false, error: "position size too small", code: "BAD_REQUEST" };
  }

  const openCount = await prisma.cexMarginPosition.count({
    where: { userId: user.id, symbol: CEX_MATCHER_SYMBOL, status: "open" },
  });
  const maxOpen = parseInt(process.env.MARGIN_MAX_OPEN_PER_USER || "4", 10);
  const maxO = Number.isFinite(maxOpen) && maxOpen > 0 ? Math.min(20, maxOpen) : 4;
  if (openCount >= maxO) {
    return { ok: false, error: `max ${maxO} open margin positions per user`, code: "LIMIT" };
  }

  let created = null;
  try {
    await prisma.$transaction(async (tx) => {
      const qRow = await getBalanceRow(tx, user.id, CEX_QUOTE_ASSET);
      if (d(qRow.available).lt(collateral)) {
        const err = new Error(`insufficient ${CEX_QUOTE_ASSET} available`);
        err.code = "INSUFFICIENT_COLLATERAL";
        throw err;
      }
      await tx.cexBalance.update({
        where: { id: qRow.id },
        data: { available: d(qRow.available).minus(collateral).toString() },
      });
      await tx.cexLedgerEntry.create({
        data: {
          userId: user.id,
          kind: "margin_collateral_lock",
          asset: CEX_QUOTE_ASSET,
          deltaAvail: collateral.negated().toString(),
        },
      });
      created = await tx.cexMarginPosition.create({
        data: {
          userId: user.id,
          symbol: CEX_MATCHER_SYMBOL,
          side: sideRaw,
          leverage: lev,
          collateralQuote: collateral.toString(),
          sizeBase: sizeBase.toString(),
          entryPrice: mark.toString(),
          status: "open",
          lastMarkPrice: mark.toString(),
        },
      });
    });
  } catch (e) {
    if (e && e.code === "INSUFFICIENT_COLLATERAL") {
      return { ok: false, error: e.message, code: e.code };
    }
    throw e;
  }

  await sweepLiquidations();
  return { ok: true, position: created };
}

/**
 * @param {{ id: string }} user
 * @param {string} positionId
 */
async function closePosition(user, positionId) {
  if (!marginEnabled()) return { ok: false, error: "margin trading disabled", code: "DISABLED" };
  if (!user?.id) return { ok: false, error: "not authenticated", code: "UNAUTHENTICATED" };

  const rid = String(positionId || "").trim();
  if (!rid) return { ok: false, error: "positionId required", code: "BAD_REQUEST" };

  const pos = await prisma.cexMarginPosition.findFirst({
    where: { id: rid, userId: user.id, symbol: CEX_MATCHER_SYMBOL, status: "open" },
  });
  if (!pos) return { ok: false, error: "position not found or not open", code: "NOT_FOUND" };

  let mark;
  try {
    mark = await getMarkPriceDecimal();
  } catch (e) {
    return { ok: false, error: e.message, code: e.code || "NO_MARK_PRICE" };
  }

  await closePositionAsSystem(pos, mark, "USER_CLOSE");
  await sweepLiquidations();

  const updated = await prisma.cexMarginPosition.findUnique({ where: { id: rid } });
  return { ok: true, position: updated };
}

module.exports = {
  marginEnabled,
  publicConfigExtras,
  getMarkPriceDecimal,
  listPositions,
  openPosition,
  closePosition,
  sweepLiquidations,
};
