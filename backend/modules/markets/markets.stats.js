function hash32(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rand01(seed) {
  // xorshift32 -> [0,1)
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 1_000_000) / 1_000_000;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function mockStatsForPair(pair) {
  const key = `${pair.symbol}|${pair.base}|${pair.quote}`;
  const h = hash32(key);
  const r1 = rand01(h ^ 0xa11ce);
  const r2 = rand01(h ^ 0xb22df);
  const r3 = rand01(h ^ 0xc33ea);

  // Price scale: keep stablecoins around 1, majors higher, everything else mid-range.
  let basePrice = 0.5 + r1 * 50; // 0.5 .. 50.5
  const sym = String(pair.base || "").toUpperCase();
  if (sym === "BTC") basePrice = 20_000 + r1 * 40_000;
  else if (sym === "ETH") basePrice = 800 + r1 * 3_500;
  else if (sym === "BNB") basePrice = 150 + r1 * 600;
  else if (sym === "USDT" || sym === "USDC" || sym === "DAI") basePrice = 0.995 + r1 * 0.02;

  // 24h change: -12% .. +12%
  const change24hPct = clamp((r2 - 0.5) * 24, -12, 12);

  // Volume: 10k .. 25m (quote units, mocked)
  const volume24hQuote = Math.round(10_000 + r3 * 25_000_000);

  return {
    symbol: pair.symbol,
    price: Number(basePrice.toFixed(basePrice > 1000 ? 2 : basePrice > 10 ? 4 : 6)),
    change24hPct: Number(change24hPct.toFixed(2)),
    volume24hQuote,
    updatedAt: Date.now()
  };
}

function buildStats({ active = [], comingSoon = [] }) {
  const all = [...comingSoon, ...active];
  const items = all.map((p) => mockStatsForPair(p));
  const bySymbol = Object.fromEntries(items.map((s) => [s.symbol, s]));
  return { items, bySymbol };
}

module.exports = { buildStats };

