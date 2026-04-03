const Decimal = require("decimal.js");

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

/**
 * @typedef {object} Resting
 * @property {string} orderId
 * @property {string} userId
 * @property {'buy'|'sell'} side
 * @property {Decimal} price
 * @property {Decimal} remaining
 * @property {number} createdAt
 */

function cloneResting(r) {
  return {
    orderId: r.orderId,
    userId: r.userId,
    side: r.side,
    price: new Decimal(r.price),
    remaining: new Decimal(r.remaining),
    createdAt: r.createdAt,
  };
}

function sortBids(bids) {
  bids.sort((a, b) => {
    const c = b.price.cmp(a.price);
    if (c !== 0) return c;
    return a.createdAt - b.createdAt;
  });
}

function sortAsks(asks) {
  asks.sort((a, b) => {
    const c = a.price.cmp(b.price);
    if (c !== 0) return c;
    return a.createdAt - b.createdAt;
  });
}

/**
 * Match one incoming limit order against the book (price-time). No self-trade.
 * @param {{ orderId: string, userId: string, side: 'buy'|'sell', price: string, quantity: string, createdAt: number }} incoming
 * @param {Resting[]} bids
 * @param {Resting[]} asks
 */
function matchIncoming(incoming, bids, asks) {
  const price = new Decimal(incoming.price);
  let qtyRem = new Decimal(incoming.quantity);
  const fills = [];

  const b = bids.map(cloneResting);
  const a = asks.map(cloneResting);

  if (incoming.side === "buy") {
    while (qtyRem.gt(0)) {
      sortAsks(a);
      const idx = a.findIndex((x) => x.price.lte(price) && x.userId !== incoming.userId);
      if (idx === -1) break;
      const best = a[idx];
      const take = Decimal.min(qtyRem, best.remaining);
      fills.push({
        makerOrderId: best.orderId,
        takerOrderId: incoming.orderId,
        makerUserId: best.userId,
        takerUserId: incoming.userId,
        makerSide: "sell",
        price: best.price.toString(),
        qty: take.toString(),
      });
      best.remaining = best.remaining.minus(take);
      qtyRem = qtyRem.minus(take);
      if (best.remaining.lte(0)) a.splice(idx, 1);
    }
    if (qtyRem.gt(0)) {
      b.push({
        orderId: incoming.orderId,
        userId: incoming.userId,
        side: "buy",
        price,
        remaining: qtyRem,
        createdAt: incoming.createdAt,
      });
      sortBids(b);
    }
  } else {
    while (qtyRem.gt(0)) {
      sortBids(b);
      const idx = b.findIndex((x) => x.price.gte(price) && x.userId !== incoming.userId);
      if (idx === -1) break;
      const best = b[idx];
      const take = Decimal.min(qtyRem, best.remaining);
      fills.push({
        makerOrderId: best.orderId,
        takerOrderId: incoming.orderId,
        makerUserId: best.userId,
        takerUserId: incoming.userId,
        makerSide: "buy",
        price: best.price.toString(),
        qty: take.toString(),
      });
      best.remaining = best.remaining.minus(take);
      qtyRem = qtyRem.minus(take);
      if (best.remaining.lte(0)) b.splice(idx, 1);
    }
    if (qtyRem.gt(0)) {
      a.push({
        orderId: incoming.orderId,
        userId: incoming.userId,
        side: "sell",
        price,
        remaining: qtyRem,
        createdAt: incoming.createdAt,
      });
      sortAsks(a);
    }
  }

  const filledIncoming = new Decimal(incoming.quantity).minus(qtyRem);
  return { fills, nextBids: b, nextAsks: a, takerFilled: filledIncoming };
}

/**
 * Like {@link matchIncoming}, but does **not** rest the remainder on the book.
 * Caller may route `qtyRem` through the internal pool before resting.
 */
function matchIncomingBookOnly(incoming, bids, asks) {
  const price = new Decimal(incoming.price);
  let qtyRem = new Decimal(incoming.quantity);
  const fills = [];

  const b = bids.map(cloneResting);
  const a = asks.map(cloneResting);

  if (incoming.side === "buy") {
    while (qtyRem.gt(0)) {
      sortAsks(a);
      const idx = a.findIndex((x) => x.price.lte(price) && x.userId !== incoming.userId);
      if (idx === -1) break;
      const best = a[idx];
      const take = Decimal.min(qtyRem, best.remaining);
      fills.push({
        makerOrderId: best.orderId,
        takerOrderId: incoming.orderId,
        makerUserId: best.userId,
        takerUserId: incoming.userId,
        makerSide: "sell",
        price: best.price.toString(),
        qty: take.toString(),
      });
      best.remaining = best.remaining.minus(take);
      qtyRem = qtyRem.minus(take);
      if (best.remaining.lte(0)) a.splice(idx, 1);
    }
  } else {
    while (qtyRem.gt(0)) {
      sortBids(b);
      const idx = b.findIndex((x) => x.price.gte(price) && x.userId !== incoming.userId);
      if (idx === -1) break;
      const best = b[idx];
      const take = Decimal.min(qtyRem, best.remaining);
      fills.push({
        makerOrderId: best.orderId,
        takerOrderId: incoming.orderId,
        makerUserId: best.userId,
        takerUserId: incoming.userId,
        makerSide: "buy",
        price: best.price.toString(),
        qty: take.toString(),
      });
      best.remaining = best.remaining.minus(take);
      qtyRem = qtyRem.minus(take);
      if (best.remaining.lte(0)) b.splice(idx, 1);
    }
  }

  const filledIncoming = new Decimal(incoming.quantity).minus(qtyRem);
  return { fills, nextBids: b, nextAsks: a, takerFilled: filledIncoming, qtyRem };
}

/**
 * IOC market sell: walk all bids (best first). Does not rest remaining size.
 * @param {{ orderId: string, userId: string, quantity: string, createdAt: number }} incoming
 */
function matchMarketSell(incoming, bids, asks) {
  let qtyRem = new Decimal(incoming.quantity);
  const fills = [];
  const b = bids.map(cloneResting);
  const a = asks.map(cloneResting);

  while (qtyRem.gt(0)) {
    sortBids(b);
    const idx = b.findIndex((x) => x.userId !== incoming.userId);
    if (idx === -1) break;
    const best = b[idx];
    const take = Decimal.min(qtyRem, best.remaining);
    fills.push({
      makerOrderId: best.orderId,
      takerOrderId: incoming.orderId,
      makerUserId: best.userId,
      takerUserId: incoming.userId,
      makerSide: "buy",
      price: best.price.toString(),
      qty: take.toString(),
    });
    best.remaining = best.remaining.minus(take);
    qtyRem = qtyRem.minus(take);
    if (best.remaining.lte(0)) b.splice(idx, 1);
  }

  const takerFilled = new Decimal(incoming.quantity).minus(qtyRem);
  return { fills, nextBids: b, nextAsks: a, takerFilled };
}

/**
 * IOC market buy: spend up to `quoteBudget` (quote asset) walking asks (cheapest first).
 * @param {{ orderId: string, userId: string, quoteBudget: string, createdAt: number }} incoming
 */
function matchMarketBuy(incoming, bids, asks) {
  let quoteRem = new Decimal(incoming.quoteBudget);
  const fills = [];
  const b = bids.map(cloneResting);
  const a = asks.map(cloneResting);

  while (quoteRem.gt(0)) {
    sortAsks(a);
    const idx = a.findIndex((x) => x.userId !== incoming.userId);
    if (idx === -1) break;
    const best = a[idx];
    if (best.price.lte(0)) break;
    const maxBase = quoteRem.div(best.price);
    const take = Decimal.min(maxBase, best.remaining);
    if (take.lte(0)) break;
    const cost = take.times(best.price);
    fills.push({
      makerOrderId: best.orderId,
      takerOrderId: incoming.orderId,
      makerUserId: best.userId,
      takerUserId: incoming.userId,
      makerSide: "sell",
      price: best.price.toString(),
      qty: take.toString(),
    });
    best.remaining = best.remaining.minus(take);
    quoteRem = quoteRem.minus(cost);
    if (best.remaining.lte(0)) a.splice(idx, 1);
  }

  const quoteSpent = new Decimal(incoming.quoteBudget).minus(quoteRem);
  let baseReceived = new Decimal(0);
  for (const f of fills) baseReceived = baseReceived.plus(new Decimal(f.qty));

  return { fills, nextBids: b, nextAsks: a, quoteSpent, baseReceived };
}

function restingFromDbRow(row) {
  const remaining = new Decimal(row.quantity).minus(new Decimal(row.filled));
  if (remaining.lte(0)) return null;
  return {
    orderId: row.id,
    userId: row.userId,
    side: /** @type {'buy'|'sell'} */ (row.side),
    price: new Decimal(row.price),
    remaining,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Date.now(),
  };
}

module.exports = {
  matchIncoming,
  matchIncomingBookOnly,
  matchMarketSell,
  matchMarketBuy,
  sortBids,
  sortAsks,
  restingFromDbRow,
  Decimal,
};
