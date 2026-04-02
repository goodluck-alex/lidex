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

function intervalToSeconds(interval) {
  const s = String(interval || "1h").toLowerCase();
  if (s === "1m") return 60;
  if (s === "5m") return 300;
  if (s === "15m") return 900;
  if (s === "1h") return 3600;
  if (s === "4h") return 14400;
  if (s === "1d") return 86400;
  return 3600;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function generateCandles({ symbol, interval = "1h", limit = 120, anchorPrice = 10 }) {
  const step = intervalToSeconds(interval);
  const n = clamp(Number(limit) || 120, 10, 500);
  const key = `${symbol}|${interval}|${n}`;
  const h = hash32(key);

  const nowSec = Math.floor(Date.now() / 1000);
  const end = nowSec - (nowSec % step);
  const start = end - step * (n - 1);

  // random walk around anchorPrice
  let p = Number(anchorPrice) || 10;
  const candles = [];
  for (let i = 0; i < n; i++) {
    const t = start + i * step;
    const r1 = rand01(h ^ (i * 2654435761));
    const r2 = rand01((h + 1337) ^ (i * 1597334677));
    const r3 = rand01((h + 4242) ^ (i * 362437));

    const drift = (r1 - 0.5) * 0.02; // -1%..+1% per candle
    const vol = 0.006 + r2 * 0.02; // wick size

    const open = p;
    const close = p * (1 + drift);
    const high = Math.max(open, close) * (1 + vol);
    const low = Math.min(open, close) * (1 - vol);
    const volume = Math.round(1000 + r3 * 250000);

    candles.push({
      time: t, // unix seconds (lightweight-charts format)
      open: Number(open.toFixed(6)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      close: Number(close.toFixed(6)),
      volume
    });
    p = close;
  }

  return candles;
}

module.exports = { generateCandles };

