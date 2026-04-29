const marketsModel = require("./markets.model");
const marketsStats = require("./markets.stats");
const marketsCandles = require("./markets.candles");
const { fetchKlines } = require("./markets.binanceKlines");

async function pairs({ lidexMode } = {}) {
  const listed = await marketsModel.listPairs();
  // DEX UI should show only pairs that are actually tradable (no "coming soon" surfaces).
  if (lidexMode === "dex") {
    return {
      ok: true,
      active: (listed.active || []).filter((p) => p?.routableOn0x !== false),
      comingSoon: [],
    };
  }
  return { ok: true, ...listed };
}

async function stats() {
  const listed = await marketsModel.listPairs();
  const { items, bySymbol } = marketsStats.buildStats(listed);
  return { ok: true, items, bySymbol, updatedAt: Date.now() };
}

async function candles({ symbol, interval, limit }) {
  const listed = await marketsModel.listPairs();
  const { bySymbol } = marketsStats.buildStats(listed);
  const s = String(symbol || "");
  if (!s) return { ok: false, error: "symbol is required" };
  const intv = String(interval || "1h");

  const live = await fetchKlines({ symbol: s, interval: intv, limit });
  if (live?.length) {
    return {
      ok: true,
      symbol: s,
      interval: intv,
      candles: live,
      updatedAt: Date.now(),
      source: "binance",
    };
  }

  const anchorPrice = bySymbol?.[s]?.price || 10;
  const items = marketsCandles.generateCandles({ symbol: s, interval: intv, limit, anchorPrice });
  return {
    ok: true,
    symbol: s,
    interval: intv,
    candles: items,
    updatedAt: Date.now(),
    source: "synthetic",
  };
}

module.exports = { pairs, stats, candles };

