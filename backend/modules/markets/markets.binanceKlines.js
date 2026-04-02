const KLINES_URL = "https://api.binance.com/api/v3/klines";

/** USDT bases we ship in @lidex/shared phase1.active — all spot-trade vs USDT on Binance. */
const BINANCE_USDT_BASES = new Set(["ETH", "BNB", "MATIC", "AVAX", "ARB"]);

function toBinanceSymbol(uiSymbol) {
  const parts = String(uiSymbol || "").split("/");
  const base = parts[0]?.toUpperCase();
  const quote = parts[1]?.toUpperCase();
  if (!base || quote !== "USDT") return null;
  if (!BINANCE_USDT_BASES.has(base)) return null;
  return `${base}USDT`;
}

function normalizeInterval(interval) {
  const s = String(interval || "1h").toLowerCase();
  const allowed = new Set([
    "1m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "6h",
    "8h",
    "12h",
    "1d",
    "3d",
    "1w",
    "1M",
  ]);
  return allowed.has(s) ? s : "1h";
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * @returns {Promise<{ time: number, open: number, high: number, low: number, close: number, volume: number }[]|null>}
 */
async function fetchKlines({ symbol, interval, limit }) {
  const binanceSym = toBinanceSymbol(symbol);
  if (!binanceSym) return null;

  const lim = clamp(Number(limit) || 120, 10, 1000);
  const intv = normalizeInterval(interval);
  const url = `${KLINES_URL}?symbol=${encodeURIComponent(binanceSym)}&interval=${intv}&limit=${lim}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;

    return rows.map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchKlines, toBinanceSymbol, normalizeInterval };
