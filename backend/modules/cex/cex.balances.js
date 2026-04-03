const Decimal = require("decimal.js");
const { prisma } = require("../../lib/prisma");
const { CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("./cex.config");
const { takerFeeOnBuyBase, takerFeeOnSellQuote } = require("./cex.fees");

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

function d(x) {
  return new Decimal(x || 0);
}

async function getBalanceRow(tx, userId, asset) {
  const client = tx || prisma;
  const row = await client.cexBalance.findUnique({
    where: { userId_asset: { userId, asset } },
  });
  if (row) return row;
  return client.cexBalance.create({
    data: { userId, asset, available: "0", locked: "0" },
  });
}

async function assertNonNegative(str) {
  if (d(str).lt(0)) throw new Error("balance would go negative");
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function lockForBuy(tx, userId, price, quantity) {
  const cost = d(price).times(d(quantity));
  const quoteRow = await getBalanceRow(tx, userId, CEX_QUOTE_ASSET);
  const av = d(quoteRow.available);
  if (av.lt(cost)) {
    const err = new Error(`insufficient ${CEX_QUOTE_ASSET} available`);
    err.code = "INSUFFICIENT_QUOTE";
    throw err;
  }
  const nextAv = av.minus(cost);
  const nextLocked = d(quoteRow.locked).plus(cost);
  await assertNonNegative(nextAv);
  await tx.cexBalance.update({
    where: { id: quoteRow.id },
    data: { available: nextAv.toString(), locked: nextLocked.toString() },
  });
}

/**
 * Market buy: lock exact quote budget (IOC spends up to this).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function lockForMarketBuy(tx, userId, quoteBudget) {
  const cost = d(quoteBudget);
  const quoteRow = await getBalanceRow(tx, userId, CEX_QUOTE_ASSET);
  const av = d(quoteRow.available);
  if (av.lt(cost)) {
    const err = new Error(`insufficient ${CEX_QUOTE_ASSET} available`);
    err.code = "INSUFFICIENT_QUOTE";
    throw err;
  }
  const nextAv = av.minus(cost);
  const nextLocked = d(quoteRow.locked).plus(cost);
  await assertNonNegative(nextAv);
  await tx.cexBalance.update({
    where: { id: quoteRow.id },
    data: { available: nextAv.toString(), locked: nextLocked.toString() },
  });
}

/** Move amount from locked quote back to available (e.g. IOC remainder). */
async function releaseExcessLockedQuote(tx, userId, amount) {
  const x = d(amount);
  if (x.lte(0)) return;
  const quoteRow = await getBalanceRow(tx, userId, CEX_QUOTE_ASSET);
  const locked = d(quoteRow.locked).minus(x);
  await assertNonNegative(locked);
  await tx.cexBalance.update({
    where: { id: quoteRow.id },
    data: {
      locked: locked.toString(),
      available: d(quoteRow.available).plus(x).toString(),
    },
  });
}

async function lockForSell(tx, userId, quantity) {
  const qty = d(quantity);
  const baseRow = await getBalanceRow(tx, userId, CEX_BASE_ASSET);
  const av = d(baseRow.available);
  if (av.lt(qty)) {
    const err = new Error(`insufficient ${CEX_BASE_ASSET} available`);
    err.code = "INSUFFICIENT_BASE";
    throw err;
  }
  const nextAv = av.minus(qty);
  const nextLocked = d(baseRow.locked).plus(qty);
  await assertNonNegative(nextAv);
  await tx.cexBalance.update({
    where: { id: baseRow.id },
    data: { available: nextAv.toString(), locked: nextLocked.toString() },
  });
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ makerSide: 'buy'|'sell', makerUserId: string, takerUserId: string, price: string, qty: string, treasuryUserId?: string | null, takerFeeBps?: number }} fill
 */
async function applyFill(tx, fill) {
  const price = d(fill.price);
  const qty = d(fill.qty);
  const quoteAmt = price.times(qty);
  const treasuryUserId = fill.treasuryUserId ?? null;

  async function creditTreasury(asset, feeAmt) {
    if (!treasuryUserId || feeAmt.lte(0)) return;
    const row = await getBalanceRow(tx, treasuryUserId, asset);
    await tx.cexBalance.update({
      where: { id: row.id },
      data: { available: d(row.available).plus(feeAmt).toString() },
    });
  }

  async function ledgerFee(takerId, asset, feeAmt) {
    if (feeAmt.lte(0)) return;
    await tx.cexLedgerEntry.create({
      data: {
        userId: takerId,
        kind: "trade_fee",
        asset,
        deltaAvail: feeAmt.negated().toString(),
      },
    });
    if (treasuryUserId) {
      await tx.cexLedgerEntry.create({
        data: {
          userId: treasuryUserId,
          kind: "trade_fee_in",
          asset,
          deltaAvail: feeAmt.toString(),
        },
      });
    }
  }

  if (fill.makerSide === "sell") {
    const sellerId = fill.makerUserId;
    const buyerId = fill.takerUserId;

    const sellerBase = await getBalanceRow(tx, sellerId, CEX_BASE_ASSET);
    const sellerQuote = await getBalanceRow(tx, sellerId, CEX_QUOTE_ASSET);
    const buyerQuote = await getBalanceRow(tx, buyerId, CEX_QUOTE_ASSET);
    const buyerBase = await getBalanceRow(tx, buyerId, CEX_BASE_ASSET);

    const sLocked = d(sellerBase.locked).minus(qty);
    const bLocked = d(buyerQuote.locked).minus(quoteAmt);
    await assertNonNegative(sLocked);
    await assertNonNegative(bLocked);

    const feeBase = takerFeeOnBuyBase(fill.qty, fill.takerFeeBps);
    const netToTakerBase = qty.minus(feeBase);
    if (netToTakerBase.lt(0)) {
      throw new Error("CEX fee exceeds taker base receive");
    }

    await tx.cexBalance.update({
      where: { id: sellerBase.id },
      data: { locked: sLocked.toString() },
    });
    await tx.cexBalance.update({
      where: { id: sellerQuote.id },
      data: { available: d(sellerQuote.available).plus(quoteAmt).toString() },
    });
    await tx.cexBalance.update({
      where: { id: buyerQuote.id },
      data: { locked: bLocked.toString() },
    });
    await tx.cexBalance.update({
      where: { id: buyerBase.id },
      data: { available: d(buyerBase.available).plus(netToTakerBase).toString() },
    });
    await creditTreasury(CEX_BASE_ASSET, feeBase);
    await ledgerFee(buyerId, CEX_BASE_ASSET, feeBase);
    return;
  }

  /* makerSide === 'buy' — resting bid, taker sell */
  const buyerId = fill.makerUserId;
  const sellerId = fill.takerUserId;

  const buyerQuote = await getBalanceRow(tx, buyerId, CEX_QUOTE_ASSET);
  const buyerBase = await getBalanceRow(tx, buyerId, CEX_BASE_ASSET);
  const sellerBase = await getBalanceRow(tx, sellerId, CEX_BASE_ASSET);
  const sellerQuote = await getBalanceRow(tx, sellerId, CEX_QUOTE_ASSET);

  const bLocked = d(buyerQuote.locked).minus(quoteAmt);
  const sLocked = d(sellerBase.locked).minus(qty);
  await assertNonNegative(bLocked);
  await assertNonNegative(sLocked);

  const feeQuote = takerFeeOnSellQuote(fill.price, fill.qty, fill.takerFeeBps);
  const netToTakerQuote = quoteAmt.minus(feeQuote);
  if (netToTakerQuote.lt(0)) {
    throw new Error("CEX fee exceeds taker quote receive");
  }

  await tx.cexBalance.update({
    where: { id: buyerQuote.id },
    data: { locked: bLocked.toString() },
  });
  await tx.cexBalance.update({
    where: { id: buyerBase.id },
    data: { available: d(buyerBase.available).plus(qty).toString() },
  });
  await tx.cexBalance.update({
    where: { id: sellerBase.id },
    data: { locked: sLocked.toString() },
  });
  await tx.cexBalance.update({
    where: { id: sellerQuote.id },
    data: { available: d(sellerQuote.available).plus(netToTakerQuote).toString() },
  });
  await creditTreasury(CEX_QUOTE_ASSET, feeQuote);
  await ledgerFee(sellerId, CEX_QUOTE_ASSET, feeQuote);
}

/**
 * Unlock remaining margin for a cancelled or filled order.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function unlockBuyRemainder(tx, userId, price, quantityRemain) {
  const refund = d(price).times(d(quantityRemain));
  if (refund.lte(0)) return;
  const quoteRow = await getBalanceRow(tx, userId, CEX_QUOTE_ASSET);
  const locked = d(quoteRow.locked).minus(refund);
  await assertNonNegative(locked);
  await tx.cexBalance.update({
    where: { id: quoteRow.id },
    data: {
      locked: locked.toString(),
      available: d(quoteRow.available).plus(refund).toString(),
    },
  });
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function unlockSellRemainder(tx, userId, quantityRemain) {
  const q = d(quantityRemain);
  if (q.lte(0)) return;
  const baseRow = await getBalanceRow(tx, userId, CEX_BASE_ASSET);
  const locked = d(baseRow.locked).minus(q);
  await assertNonNegative(locked);
  await tx.cexBalance.update({
    where: { id: baseRow.id },
    data: {
      locked: locked.toString(),
      available: d(baseRow.available).plus(q).toString(),
    },
  });
}

async function listBalances(userId) {
  const rows = await prisma.cexBalance.findMany({
    where: { userId },
  });
  const byAsset = Object.fromEntries(rows.map((r) => [r.asset, { available: r.available, locked: r.locked }]));
  return {
    base: CEX_BASE_ASSET,
    quote: CEX_QUOTE_ASSET,
    balances: byAsset,
  };
}

/** Dev / paper: credit available (no on-chain). Guard with CEX_DEV_FUNDING. Writes cex_ledger_entries when table exists. */
async function devCredit(userId, asset, amount) {
  if (String(process.env.CEX_DEV_FUNDING || "").toLowerCase() !== "true") {
    const err = new Error("CEX_DEV_FUNDING is not enabled");
    err.code = "FORBIDDEN";
    throw err;
  }
  const a = String(asset || "").trim().toUpperCase();
  const x = d(amount);
  if (x.lte(0)) {
    const err = new Error("amount must be positive");
    err.code = "BAD_AMOUNT";
    throw err;
  }

  return prisma.$transaction(async (tx) => {
    const row = await getBalanceRow(tx, userId, a);
    await tx.cexBalance.update({
      where: { id: row.id },
      data: { available: d(row.available).plus(x).toString() },
    });
    await tx.cexLedgerEntry.create({
      data: {
        userId,
        kind: "dev_credit",
        asset: a,
        deltaAvail: x.toString(),
      },
    });
    return tx.cexBalance.findUnique({ where: { id: row.id } });
  });
}

module.exports = {
  getBalanceRow,
  lockForBuy,
  lockForMarketBuy,
  releaseExcessLockedQuote,
  lockForSell,
  applyFill,
  unlockBuyRemainder,
  unlockSellRemainder,
  listBalances,
  devCredit,
  d,
  CEX_BASE_ASSET,
  CEX_QUOTE_ASSET,
};
