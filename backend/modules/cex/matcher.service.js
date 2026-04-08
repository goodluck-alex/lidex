const { prisma } = require("../../lib/prisma");
const { CEX_MATCHER_SYMBOL, CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("./cex.config");
const {
  lockForBuy,
  lockForSell,
  lockForMarketBuy,
  releaseExcessLockedQuote,
  applyFill,
  unlockBuyRemainder,
  unlockSellRemainder,
  listBalances,
  devCredit,
  d,
} = require("./cex.balances");
const {
  matchIncomingBookOnly,
  matchMarketSell,
  matchMarketBuy,
  restingFromDbRow,
  sortBids,
  sortAsks,
} = require("./matcher.engine");
const { resolveTreasuryUserId } = require("./cex.fees");
const { validateNewLimitOrder, validateMarketSellQuantity, validateExecutedNotional } = require("./cex.limits");
const cexLiquidity = require("./cex.liquidity");
const stakingService = require("../staking/staking.service");

function notifyAmbassadorTradesForOrder(orderId) {
  if (!orderId) return;
  try {
    const amb = require("../ambassador/ambassador.service");
    void amb.notifyTradeUsersForOrder(orderId);
  } catch {
    /* optional */
  }
}

/** @type {import('./matcher.engine').Resting[]} */
let _bids = [];
/** @type {import('./matcher.engine').Resting[]} */
let _asks = [];
let _hydrated = false;

let _chain = Promise.resolve();

function runExclusive(fn) {
  const run = _chain.then(() => fn());
  _chain = run.catch(() => {});
  return run;
}

/**
 * @param {unknown | null | undefined} raw
 * @returns {string | null}
 */
function normalizeClientOrderId(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.length > 64) {
    throw Object.assign(new Error("clientOrderId max length 64"), { code: "BAD_REQUEST" });
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) {
    throw Object.assign(new Error("clientOrderId must be alphanumeric plus . _ -"), { code: "BAD_REQUEST" });
  }
  return s;
}

/**
 * @param {string} userId
 * @param {string | null} clientOrderId
 */
async function assertClientOrderIdAvailable(userId, clientOrderId) {
  if (!clientOrderId) return;
  const row = await prisma.cexOrder.findFirst({
    where: { userId, clientOrderId },
    select: { id: true },
  });
  if (row) {
    throw Object.assign(new Error("clientOrderId already in use for this account"), {
      code: "CLIENT_ORDER_ID_DUPLICATE",
    });
  }
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} userId
 * @param {{ id: string; side: string; price: string; quantity: string; filled: string }} o
 */
async function cancelOrderRowTx(tx, userId, o) {
  const rem = d(o.quantity).minus(d(o.filled));
  if (o.side === "buy") await unlockBuyRemainder(tx, userId, o.price, rem.toString());
  else await unlockSellRemainder(tx, userId, rem.toString());
  await tx.cexOrder.update({
    where: { id: o.id },
    data: { status: "cancelled" },
  });
}

async function hydrateFromDb() {
  const rows = await prisma.cexOrder.findMany({
    where: {
      symbol: CEX_MATCHER_SYMBOL,
      status: { in: ["open", "partial"] },
      orderType: { not: "internal_pool" },
    },
  });
  _bids = [];
  _asks = [];
  for (const row of rows) {
    const r = restingFromDbRow(row);
    if (!r) continue;
    if (row.side === "buy") _bids.push(r);
    else _asks.push(r);
  }
  sortBids(_bids);
  sortAsks(_asks);
  _hydrated = true;
  try {
    await flushTriggeredStopOrders();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("CEX stop-limit flush after hydrate skipped:", e?.message || e);
  }
}

async function ensureHydrated() {
  if (_hydrated) return;
  await hydrateFromDb();
}

/** Best ask on book from a counterparty (exclude self-resting to reduce false rejects). */
function bestRestingAskExcludingUser(userId) {
  sortAsks(_asks);
  return _asks.find((x) => x.userId !== userId) || null;
}

/** Best bid on book from a counterparty. */
function bestRestingBidExcludingUser(userId) {
  sortBids(_bids);
  return _bids.find((x) => x.userId !== userId) || null;
}

/** True if this limit would immediately match resting liquidity (act as taker). */
function postOnlyWouldTake(side, userId, limitPriceStr) {
  const px = d(limitPriceStr);
  if (side === "buy") {
    const best = bestRestingAskExcludingUser(userId);
    if (!best) return false;
    return px.gte(best.price);
  }
  const best = bestRestingBidExcludingUser(userId);
  if (!best) return false;
  return px.lte(best.price);
}

function aggregateDepth(restings) {
  const map = new Map();
  for (const x of restings) {
    const k = x.price.toString();
    map.set(k, (map.get(k) || d(0)).plus(x.remaining));
  }
  const levels = [...map.entries()].map(([price, qty]) => ({ price, quantity: qty.toString() }));
  return levels;
}

async function getOrderbook() {
  await ensureHydrated();
  return {
    ok: true,
    symbol: CEX_MATCHER_SYMBOL,
    bids: aggregateDepth(_bids).sort((a, b) => d(b.price).cmp(a.price)),
    asks: aggregateDepth(_asks).sort((a, b) => d(a.price).cmp(b.price)),
  };
}

async function bumpFilled(tx, orderId, qtyDelta) {
  const o = await tx.cexOrder.findUnique({ where: { id: orderId } });
  if (!o) return;
  const filled = d(o.filled).plus(d(qtyDelta));
  const q = d(o.quantity);
  let status = "open";
  if (filled.gte(q)) status = "filled";
  else if (filled.gt(0)) status = "partial";
  await tx.cexOrder.update({
    where: { id: orderId },
    data: { filled: filled.toString(), status },
  });
}

async function processFillsTx(tx, fills, treasuryUserId) {
  /** @type {Map<string, number>} */
  const bpsCache = new Map();
  async function takerFeeBpsFor(uid) {
    if (bpsCache.has(uid)) return bpsCache.get(uid);
    const b = await stakingService.effectiveTakerFeeBpsForUser(uid);
    bpsCache.set(uid, b);
    return b;
  }
  for (const f of fills) {
    await tx.cexTrade.create({
      data: {
        symbol: CEX_MATCHER_SYMBOL,
        price: f.price,
        quantity: f.qty,
        makerOrderId: f.makerOrderId,
        takerOrderId: f.takerOrderId,
        makerUserId: f.makerUserId,
        takerUserId: f.takerUserId,
      },
    });
    const takerFeeBps = await takerFeeBpsFor(f.takerUserId);
    await applyFill(tx, {
      makerSide: f.makerSide,
      makerUserId: f.makerUserId,
      takerUserId: f.takerUserId,
      price: f.price,
      qty: f.qty,
      treasuryUserId,
      takerFeeBps,
    });
    await bumpFilled(tx, f.makerOrderId, f.qty);
  }
}

/**
 * Limit / stop-limit activation: match against book, then pool at limit price, then rest.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ order: { id: string, userId: string }, side: 'buy'|'sell', price: import('decimal.js').default, incoming: Parameters<typeof matchIncomingBookOnly>[0], bids: typeof _bids, asks: typeof _asks, treasuryUserId: string | null }} args
 */
async function applyLimitBookPoolAndRestTx(tx, { order, side, price, incoming, bids, asks, treasuryUserId }) {
  const { fills, nextBids, nextAsks, takerFilled, qtyRem } = matchIncomingBookOnly(incoming, bids, asks);

  if (fills.length > 0) {
    await processFillsTx(tx, fills, treasuryUserId);
  }

  let poolBaseFilled = d(0);
  let poolQuote = d(0);
  if (side === "sell") {
    const poolLeg = await cexLiquidity.extendLimitSellWithPoolInTx(tx, {
      userId: order.userId,
      baseRemainder: qtyRem.toString(),
      limitPrice: price.toString(),
      takerOrderId: order.id,
      treasuryUserId,
    });
    poolBaseFilled = poolLeg.baseFilled;
    poolQuote = poolLeg.quoteOutGross;
  } else {
    const poolLeg = await cexLiquidity.extendLimitBuyWithPoolInTx(tx, {
      userId: order.userId,
      baseRemainder: qtyRem.toString(),
      limitPrice: price.toString(),
      takerOrderId: order.id,
      treasuryUserId,
    });
    poolBaseFilled = poolLeg.baseFilled;
    poolQuote = poolLeg.quoteSpent;
  }

  let bookQuote = d(0);
  for (const f of fills) {
    bookQuote = bookQuote.plus(d(f.price).times(d(f.qty)));
  }
  const totalBaseExec = takerFilled.plus(poolBaseFilled);
  const totalQuoteExec = bookQuote.plus(poolQuote);
  if (totalBaseExec.gt(0)) {
    validateExecutedNotional(totalQuoteExec, totalBaseExec);
  }

  if (takerFilled.gt(0)) {
    await bumpFilled(tx, order.id, takerFilled.toString());
  }
  if (poolBaseFilled.gt(0)) {
    await bumpFilled(tx, order.id, poolBaseFilled.toString());
  }

  let nextBidsOut = nextBids;
  let nextAsksOut = nextAsks;
  const remRest = qtyRem.minus(poolBaseFilled);
  if (remRest.gt(0)) {
    if (side === "buy") {
      nextBidsOut = [...nextBids];
      nextBidsOut.push({
        orderId: order.id,
        userId: order.userId,
        side: "buy",
        price,
        remaining: remRest,
        createdAt: incoming.createdAt,
      });
      sortBids(nextBidsOut);
    } else {
      nextAsksOut = [...nextAsks];
      nextAsksOut.push({
        orderId: order.id,
        userId: order.userId,
        side: "sell",
        price,
        remaining: remRest,
        createdAt: incoming.createdAt,
      });
      sortAsks(nextAsksOut);
    }
  }

  return { nextBids: nextBidsOut, nextAsks: nextAsksOut };
}

/**
 * @param {{ userId: string, side: 'buy'|'sell', price: string, quantity: string, postOnly?: boolean }} p
 */
function placeLimitOrder(p) {
  return runExclusive(async () => {
    await ensureHydrated();
    const side = String(p.side).toLowerCase();
    if (side !== "buy" && side !== "sell") throw Object.assign(new Error("side must be buy or sell"), { code: "BAD_SIDE" });
    const price = d(p.price);
    const quantity = d(p.quantity);
    if (price.lte(0) || quantity.lte(0)) {
      throw Object.assign(new Error("price and quantity must be positive"), { code: "BAD_AMOUNT" });
    }
    validateNewLimitOrder({ price, quantity, side });

    const postOnly = p.postOnly === true || String(p.postOnly).toLowerCase() === "true";
    if (postOnly && postOnlyWouldTake(side, p.userId, price.toString())) {
      throw Object.assign(new Error("post-only order would take liquidity (would cross the book)"), {
        code: "POST_ONLY_WOULD_TAKE",
      });
    }

    const treasuryUserId = await resolveTreasuryUserId();

    const out = await prisma.$transaction(
      async (tx) => {
        if (side === "buy") await lockForBuy(tx, p.userId, price.toString(), quantity.toString());
        else await lockForSell(tx, p.userId, quantity.toString());

        const order = await tx.cexOrder.create({
          data: {
            userId: p.userId,
            symbol: CEX_MATCHER_SYMBOL,
            side,
            orderType: "limit",
            price: price.toString(),
            quantity: quantity.toString(),
            filled: "0",
            status: "open",
            postOnly,
            ...(p.clientOrderId ? { clientOrderId: p.clientOrderId } : {}),
          },
        });

        const incoming = {
          orderId: order.id,
          userId: p.userId,
          side: /** @type {'buy'|'sell'} */ (side),
          price: price.toString(),
          quantity: quantity.toString(),
          createdAt: order.createdAt.getTime(),
        };

        const { nextBids: nextBidsOut, nextAsks: nextAsksOut } = await applyLimitBookPoolAndRestTx(tx, {
          order,
          side: /** @type {'buy'|'sell'} */ (side),
          price,
          incoming,
          bids: _bids,
          asks: _asks,
          treasuryUserId,
        });

        const finalized = await tx.cexOrder.findUnique({ where: { id: order.id } });
        return { finalized, nextBids: nextBidsOut, nextAsks: nextAsksOut };
      },
      { timeout: 30_000 }
    );

    _bids = out.nextBids;
    _asks = out.nextAsks;

    await flushTriggeredStopOrders();

    notifyAmbassadorTradesForOrder(out.finalized?.id);
    return { ok: true, order: out.finalized };
  });
}

function placeMarketSell(p) {
  return runExclusive(async () => {
    await ensureHydrated();
    const quantity = d(p.quantity);
    if (quantity.lte(0)) {
      throw Object.assign(new Error("quantity must be positive"), { code: "BAD_AMOUNT" });
    }
    validateMarketSellQuantity(quantity);

    const treasuryUserId = await resolveTreasuryUserId();

    const out = await prisma.$transaction(
      async (tx) => {
        await lockForSell(tx, p.userId, quantity.toString());

        const order = await tx.cexOrder.create({
          data: {
            userId: p.userId,
            symbol: CEX_MATCHER_SYMBOL,
            side: "sell",
            orderType: "market",
            price: "0",
            quantity: quantity.toString(),
            filled: "0",
            status: "open",
            ...(p.clientOrderId ? { clientOrderId: p.clientOrderId } : {}),
          },
        });

        const incoming = {
          orderId: order.id,
          userId: p.userId,
          quantity: quantity.toString(),
          createdAt: order.createdAt.getTime(),
        };

        const { fills, nextBids, nextAsks, takerFilled: bookFilled } = matchMarketSell(incoming, _bids, _asks);

        let quoteRecv = d(0);
        for (const f of fills) quoteRecv = quoteRecv.plus(d(f.price).times(d(f.qty)));

        if (bookFilled.gt(0)) {
          await processFillsTx(tx, fills, treasuryUserId);
        }

        const poolSell = await cexLiquidity.extendMarketSellWithPoolInTx(tx, {
          userId: p.userId,
          baseRemainder: quantity.minus(bookFilled).toString(),
          takerOrderId: order.id,
          treasuryUserId,
        });
        const totalFilled = bookFilled.plus(poolSell.baseFilled);
        quoteRecv = quoteRecv.plus(poolSell.quoteOutGross);

        if (totalFilled.lte(0)) {
          await unlockSellRemainder(tx, p.userId, quantity.toString());
          await tx.cexOrder.update({
            where: { id: order.id },
            data: { status: "cancelled", filled: "0" },
          });
          throw Object.assign(new Error("no liquidity for market order"), { code: "NO_LIQUIDITY" });
        }

        validateExecutedNotional(quoteRecv, totalFilled);

        const unfilled = quantity.minus(totalFilled);
        if (unfilled.gt(0)) {
          await unlockSellRemainder(tx, p.userId, unfilled.toString());
        }

        const vwap = quoteRecv.div(totalFilled).toString();
        await tx.cexOrder.update({
          where: { id: order.id },
          data: {
            filled: totalFilled.toString(),
            status: "filled",
            price: vwap,
          },
        });

        const finalized = await tx.cexOrder.findUnique({ where: { id: order.id } });
        return { finalized, nextBids, nextAsks };
      },
      { timeout: 30_000 }
    );

    _bids = out.nextBids;
    _asks = out.nextAsks;

    await flushTriggeredStopOrders();

    notifyAmbassadorTradesForOrder(out.finalized?.id);
    return { ok: true, order: out.finalized };
  });
}

function placeMarketBuy(p) {
  return runExclusive(async () => {
    await ensureHydrated();
    const quoteBudget = d(p.quoteBudget);
    if (quoteBudget.lte(0)) {
      throw Object.assign(new Error("quoteBudget must be positive"), { code: "BAD_AMOUNT" });
    }

    const treasuryUserId = await resolveTreasuryUserId();

    const out = await prisma.$transaction(
      async (tx) => {
        await lockForMarketBuy(tx, p.userId, quoteBudget.toString());

        const order = await tx.cexOrder.create({
          data: {
            userId: p.userId,
            symbol: CEX_MATCHER_SYMBOL,
            side: "buy",
            orderType: "market",
            price: "0",
            quantity: "0",
            filled: "0",
            status: "open",
            ...(p.clientOrderId ? { clientOrderId: p.clientOrderId } : {}),
          },
        });

        const incoming = {
          orderId: order.id,
          userId: p.userId,
          quoteBudget: quoteBudget.toString(),
          createdAt: order.createdAt.getTime(),
        };

        const { fills, nextBids, nextAsks, quoteSpent: bookQuoteSpent, baseReceived: bookBaseReceived } =
          matchMarketBuy(incoming, _bids, _asks);

        if (bookBaseReceived.gt(0)) {
          await processFillsTx(tx, fills, treasuryUserId);
        }

        const quoteRem = quoteBudget.minus(bookQuoteSpent);
        const poolBuy = await cexLiquidity.extendMarketBuyWithPoolInTx(tx, {
          userId: p.userId,
          quoteRemainder: quoteRem.toString(),
          takerOrderId: order.id,
          treasuryUserId,
        });
        const totalQuoteSpent = bookQuoteSpent.plus(poolBuy.quoteSpent);
        const totalBaseReceived = bookBaseReceived.plus(poolBuy.baseFilled);

        if (totalBaseReceived.lte(0)) {
          await releaseExcessLockedQuote(tx, p.userId, quoteBudget);
          await tx.cexOrder.update({
            where: { id: order.id },
            data: { status: "cancelled" },
          });
          throw Object.assign(new Error("no liquidity for market order"), { code: "NO_LIQUIDITY" });
        }

        validateExecutedNotional(totalQuoteSpent, totalBaseReceived);

        const unusedQuote = quoteBudget.minus(totalQuoteSpent);
        if (unusedQuote.gt(0)) {
          await releaseExcessLockedQuote(tx, p.userId, unusedQuote.toString());
        }

        const vwap = totalQuoteSpent.div(totalBaseReceived).toString();
        await tx.cexOrder.update({
          where: { id: order.id },
          data: {
            quantity: totalBaseReceived.toString(),
            filled: totalBaseReceived.toString(),
            price: vwap,
            status: "filled",
          },
        });

        const finalized = await tx.cexOrder.findUnique({ where: { id: order.id } });
        return { finalized, nextBids, nextAsks };
      },
      { timeout: 30_000 }
    );

    _bids = out.nextBids;
    _asks = out.nextAsks;

    await flushTriggeredStopOrders();

    notifyAmbassadorTradesForOrder(out.finalized?.id);
    return { ok: true, order: out.finalized };
  });
}

/**
 * Last trade price vs stop: sell stops fire when last <= stop; buy stops when last >= stop.
 */
function stopOrderShouldFire(sideRaw, stopPx, lastPx) {
  const side = String(sideRaw).toLowerCase();
  if (side === "sell") return lastPx.lte(stopPx);
  if (side === "buy") return lastPx.gte(stopPx);
  return false;
}

/**
 * Turn a pending stop-limit into an active limit and match (funds already locked).
 * @param {import('@prisma/client').CexOrder} orderRow
 */
async function activateStopOrderInTransaction(tx, orderRow, treasuryUserId) {
  const o = await tx.cexOrder.findUnique({ where: { id: orderRow.id } });
  if (!o || o.status !== "pending_stop") {
    return { activated: false, nextBids: _bids, nextAsks: _asks };
  }
  await tx.cexOrder.update({
    where: { id: o.id },
    data: { status: "open" },
  });
  const rem = d(o.quantity).minus(d(o.filled));
  const side = /** @type {'buy'|'sell'} */ (String(o.side).toLowerCase());
  const px = d(o.price);
  const incoming = {
    orderId: o.id,
    userId: o.userId,
    side,
    price: o.price,
    quantity: rem.toString(),
    createdAt: o.createdAt.getTime(),
  };
  const { nextBids, nextAsks } = await applyLimitBookPoolAndRestTx(tx, {
    order: o,
    side,
    price: px,
    incoming,
    bids: _bids,
    asks: _asks,
    treasuryUserId,
  });
  return { activated: true, nextBids, nextAsks };
}

/** After any trade, promote stop-limits whose stop has been crossed (FIFO per activation round). */
async function flushTriggeredStopOrders() {
  const maxActivations = 64;
  for (let n = 0; n < maxActivations; n += 1) {
    const lastRow = await prisma.cexTrade.findFirst({
      where: { symbol: CEX_MATCHER_SYMBOL },
      orderBy: { createdAt: "desc" },
    });
    if (!lastRow) return;
    const lastPx = d(lastRow.price);
    const pending = await prisma.cexOrder.findMany({
      where: { symbol: CEX_MATCHER_SYMBOL, status: "pending_stop" },
      orderBy: { createdAt: "asc" },
    });
    const next = pending.find(
      (o) => o.stopPrice != null && stopOrderShouldFire(o.side, d(o.stopPrice), lastPx)
    );
    if (!next) return;
    const treasuryUserId = await resolveTreasuryUserId();
    const out = await prisma.$transaction(
      async (tx) => activateStopOrderInTransaction(tx, next, treasuryUserId),
      { timeout: 30_000 }
    );
    if (out.activated) {
      _bids = out.nextBids;
      _asks = out.nextAsks;
    }
  }
}

function placeStopLimitOrder(p) {
  return runExclusive(async () => {
    await ensureHydrated();
    const side = String(p.side).toLowerCase();
    if (side !== "buy" && side !== "sell") {
      throw Object.assign(new Error("side must be buy or sell"), { code: "BAD_SIDE" });
    }
    const stopPrice = d(p.stopPrice);
    const price = d(p.price);
    const quantity = d(p.quantity);
    if (stopPrice.lte(0) || price.lte(0) || quantity.lte(0)) {
      throw Object.assign(new Error("stopPrice, price and quantity must be positive"), { code: "BAD_AMOUNT" });
    }
    validateNewLimitOrder({ price, quantity, side });

    /** @type {string} */
    let createdId;
    await prisma.$transaction(
      async (tx) => {
        if (side === "buy") await lockForBuy(tx, p.userId, price.toString(), quantity.toString());
        else await lockForSell(tx, p.userId, quantity.toString());

        const order = await tx.cexOrder.create({
          data: {
            userId: p.userId,
            symbol: CEX_MATCHER_SYMBOL,
            side,
            orderType: "stop_limit",
            stopPrice: stopPrice.toString(),
            price: price.toString(),
            quantity: quantity.toString(),
            filled: "0",
            status: "pending_stop",
            ...(p.clientOrderId ? { clientOrderId: p.clientOrderId } : {}),
          },
        });
        createdId = order.id;
      },
      { timeout: 30_000 }
    );

    await flushTriggeredStopOrders();

    const finalized = await prisma.cexOrder.findUnique({ where: { id: createdId } });
    return { ok: true, order: finalized };
  });
}

/**
 * @param {{ userId: string, side?: string, orderType?: string, price?: string, quantity?: string, quoteBudget?: string, stopPrice?: string, postOnly?: boolean, clientOrderId?: unknown }} p
 */
async function placeOrder(p) {
  const cid = normalizeClientOrderId(p.clientOrderId);
  await assertClientOrderIdAvailable(p.userId, cid);
  const enriched = { ...p, clientOrderId: cid };

  const orderType = String(p.orderType || "limit").toLowerCase();
  if (orderType === "market") {
    const side = String(p.side || "").toLowerCase();
    if (side === "sell") return placeMarketSell(enriched);
    if (side === "buy") return placeMarketBuy(enriched);
    throw Object.assign(new Error("side must be buy or sell"), { code: "BAD_SIDE" });
  }
  if (orderType === "stop_limit" || orderType === "stop-limit") {
    return placeStopLimitOrder(enriched);
  }
  return placeLimitOrder(enriched);
}

function removeResting(orderId) {
  _bids = _bids.filter((x) => x.orderId !== orderId);
  _asks = _asks.filter((x) => x.orderId !== orderId);
}

/**
 * @param {{ userId: string, orderId: string }} p
 */
function cancelOrder(p) {
  return runExclusive(async () => {
    await ensureHydrated();
    await prisma.$transaction(
      async (tx) => {
        const o = await tx.cexOrder.findFirst({
          where: {
            id: p.orderId,
            userId: p.userId,
            symbol: CEX_MATCHER_SYMBOL,
            status: { in: ["open", "partial", "pending_stop"] },
          },
        });
        if (!o) {
          throw Object.assign(new Error("order not found or not cancellable"), { code: "NOT_FOUND" });
        }
        await cancelOrderRowTx(tx, p.userId, o);
      },
      { timeout: 15_000 }
    );

    removeResting(p.orderId);
    return { ok: true };
  });
}

/**
 * Cancel all resting / pending-stop user orders (excludes `internal_pool`). P8-M4: disconnect / bot hygiene.
 * @param {{ userId: string, includePendingStop?: boolean }} p
 */
function cancelAllUserOrders(p) {
  return runExclusive(async () => {
    await ensureHydrated();
    const statuses =
      p.includePendingStop === false ? ["open", "partial"] : ["open", "partial", "pending_stop"];
    const rows = await prisma.cexOrder.findMany({
      where: {
        userId: p.userId,
        symbol: CEX_MATCHER_SYMBOL,
        status: { in: statuses },
        orderType: { not: "internal_pool" },
      },
    });
    if (!rows.length) return { ok: true, cancelled: 0, orderIds: [] };

    await prisma.$transaction(async (tx) => {
      for (const o of rows) {
        await cancelOrderRowTx(tx, p.userId, o);
      }
    }, { timeout: 30_000 });

    for (const o of rows) removeResting(o.id);
    await flushTriggeredStopOrders();
    return { ok: true, cancelled: rows.length, orderIds: rows.map((r) => r.id) };
  });
}

/**
 * @param {string} userId
 * @param {{ limit?: number, cursor?: string | null, status?: string, orderType?: string, bookOnly?: boolean }} [opts]
 */
async function listUserOrders(userId, opts = {}) {
  const take = Math.min(200, Math.max(1, Number(opts.limit) || 50));
  const cursorId =
    opts.cursor != null && String(opts.cursor).trim() !== "" ? String(opts.cursor).trim() : null;

  /** @type {import('@prisma/client').Prisma.CexOrderWhereInput} */
  const where = { userId, symbol: CEX_MATCHER_SYMBOL };

  const st = String(opts.status || "all").toLowerCase();
  if (st === "open" || st === "active") {
    where.status = { in: ["open", "partial", "pending_stop"] };
  } else if (st === "resting") {
    where.status = { in: ["open", "partial"] };
  } else if (st === "done" || st === "closed" || st === "terminal") {
    where.status = { in: ["filled", "cancelled"] };
  }

  const ot = opts.orderType != null && String(opts.orderType).trim() !== "" ? String(opts.orderType).trim() : null;
  const bookOnly = opts.bookOnly === true;
  if (bookOnly && ot) {
    where.AND = [{ orderType: { not: "internal_pool" } }, { orderType: ot }];
  } else if (bookOnly) {
    where.orderType = { not: "internal_pool" };
  } else if (ot) {
    where.orderType = ot;
  }

  let rows;
  try {
    rows = await prisma.cexOrder.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });
  } catch (e) {
    const err = new Error("invalid or expired cursor");
    err.code = "BAD_CURSOR";
    throw err;
  }

  const hasMore = rows.length > take;
  const orders = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore && orders.length > 0 ? orders[orders.length - 1].id : null;
  return { ok: true, orders, nextCursor, hasMore };
}

/**
 * @param {object} where Prisma where for `cexTrade`
 * @param {{ limit?: number, cursor?: string | null }} [opts]
 */
async function listTradesPaged(where, opts = {}) {
  const take = Math.min(200, Math.max(1, Number(opts.limit) || 40));
  const cursorId =
    opts.cursor != null && String(opts.cursor).trim() !== "" ? String(opts.cursor).trim() : null;

  let rows;
  try {
    rows = await prisma.cexTrade.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });
  } catch (e) {
    const err = new Error("invalid or expired cursor");
    err.code = "BAD_CURSOR";
    throw err;
  }

  const hasMore = rows.length > take;
  const trades = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore && trades.length > 0 ? trades[trades.length - 1].id : null;
  return { trades, nextCursor, hasMore };
}

async function listRecentTrades(opts = {}) {
  await ensureHydrated();
  const { trades, nextCursor, hasMore } = await listTradesPaged({ symbol: CEX_MATCHER_SYMBOL }, opts);
  return { ok: true, trades, nextCursor, hasMore, scope: "market" };
}

async function listUserTrades(userId, opts = {}) {
  const where = {
    symbol: CEX_MATCHER_SYMBOL,
    OR: [{ makerUserId: userId }, { takerUserId: userId }],
  };
  const { trades, nextCursor, hasMore } = await listTradesPaged(where, opts);
  return { ok: true, trades, nextCursor, hasMore, scope: "mine" };
}

async function getStats() {
  await ensureHydrated();
  const book = await getOrderbook();
  const bestBid = book.bids[0]?.price ?? null;
  const bestAsk = book.asks[0]?.price ?? null;
  let spread = null;
  let spreadPct = null;
  if (bestBid != null && bestAsk != null) {
    const b = d(bestBid);
    const a = d(bestAsk);
    if (a.gte(b)) {
      spread = a.minus(b).toString();
      if (b.gt(0)) spreadPct = a.minus(b).div(b).times(100).toFixed(6);
    }
  }
  const lastTrade = await prisma.cexTrade.findFirst({
    where: { symbol: CEX_MATCHER_SYMBOL },
    orderBy: { createdAt: "desc" },
  });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  /** @type {{ tradeCount: number, volumeQuote: string, volumeBase: string, high: string | null, low: string | null, firstPrice: string | null, lastPrice: string | null, change24hPct: string | null }} */
  let internal24h = {
    tradeCount: 0,
    volumeQuote: "0",
    volumeBase: "0",
    high: null,
    low: null,
    firstPrice: null,
    lastPrice: null,
    change24hPct: null,
  };
  try {
    const [agg, firstTick, lastTick] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          COUNT(*)::bigint AS trade_count,
          COALESCE(SUM((price::numeric) * (quantity::numeric)), 0)::text AS volume_quote,
          COALESCE(SUM(quantity::numeric), 0)::text AS volume_base,
          MAX(price::numeric)::text AS high,
          MIN(price::numeric)::text AS low
        FROM cex_trades
        WHERE symbol = ${CEX_MATCHER_SYMBOL}
          AND created_at >= ${since}
      `,
      prisma.cexTrade.findFirst({
        where: { symbol: CEX_MATCHER_SYMBOL, createdAt: { gte: since } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { price: true },
      }),
      prisma.cexTrade.findFirst({
        where: { symbol: CEX_MATCHER_SYMBOL, createdAt: { gte: since } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { price: true },
      }),
    ]);
    const row = Array.isArray(agg) ? agg[0] : null;
    if (row) {
      internal24h = {
        tradeCount: Number(row.trade_count || 0),
        volumeQuote: String(row.volume_quote ?? "0"),
        volumeBase: String(row.volume_base ?? "0"),
        high: row.high != null && String(row.high).length ? String(row.high) : null,
        low: row.low != null && String(row.low).length ? String(row.low) : null,
        firstPrice: null,
        lastPrice: null,
        change24hPct: null,
      };
    }
    if (internal24h.tradeCount > 0 && firstTick && lastTick) {
      const o = d(firstTick.price);
      internal24h.firstPrice = firstTick.price;
      internal24h.lastPrice = lastTick.price;
      if (o.gt(0)) {
        internal24h.change24hPct = d(lastTick.price).minus(o).div(o).times(100).toFixed(4);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("CEX internal 24h stats query failed:", e?.message || e);
  }

  return {
    ok: true,
    symbol: CEX_MATCHER_SYMBOL,
    baseAsset: CEX_BASE_ASSET,
    quoteAsset: CEX_QUOTE_ASSET,
    bestBid,
    bestAsk,
    spread,
    spreadPct,
    lastTrade: lastTrade
      ? {
          price: lastTrade.price,
          quantity: lastTrade.quantity,
          createdAt: lastTrade.createdAt.getTime(),
        }
      : null,
    internal24h: {
      ...internal24h,
      windowStartMs: since.getTime(),
    },
  };
}

module.exports = {
  hydrateFromDb,
  ensureHydrated,
  getOrderbook,
  placeOrder,
  cancelOrder,
  cancelAllUserOrders,
  listUserOrders,
  listBalances,
  devCredit,
  listRecentTrades,
  listUserTrades,
  getStats,
  CEX_MATCHER_SYMBOL,
};
