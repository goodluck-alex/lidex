function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

function cacheMs() {
  return intEnv("SWAP_QUOTE_SESSION_CACHE_MS", 20_000);
}

function hashAlgo() {
  return String(process.env.SWAP_QUOTE_REQUEST_HASH_ALGO || "sha256").trim().toLowerCase() || "sha256";
}

function normLower(x) {
  return String(x || "").trim().toLowerCase();
}

function normUpper(x) {
  return String(x || "").trim().toUpperCase();
}

function normAmount(x) {
  return String(x ?? "").trim();
}

function normSlippage(x) {
  if (x == null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Canonical key for a swap quote request.
 * Keep it stable and include all params that materially change the quote/tx.
 */
function normalizeQuoteRequest(body, { fee } = {}) {
  const b = body && typeof body === "object" ? body : {};
  const f = fee && typeof fee === "object" ? fee : {};
  return {
    chainId: Number(b.chainId),
    sellToken: normLower(b.sellToken),
    buyToken: normLower(b.buyToken),
    sellAmount: normAmount(b.sellAmount),
    taker: normLower(b.taker || ""),
    slippagePercentage: normSlippage(b.slippagePercentage),
    // Integrator fee config changes tx payload; include it to avoid mismatched cache hits.
    swapFeeRecipient: normLower(f.swapFeeRecipient || ""),
    swapFeeBps: String(f.swapFeeBps || "").trim(),
    swapFeeToken: String(f.swapFeeToken || "").trim(),
  };
}

function stableStringify(obj) {
  // stable-ish stringify: known fixed key order
  return JSON.stringify(obj);
}

function requestHash(normReq) {
  // Node built-in crypto
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require("crypto");
  const s = stableStringify(normReq);
  return crypto.createHash(hashAlgo()).update(s).digest("hex");
}

function makeQuoteId(normReq) {
  // Short deterministic id; good enough for in-memory cache correlation.
  // Note: not a security token; it's only valid within TTL.
  const s = stableStringify(normReq);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // include timestamp bucket to avoid long-lived collisions
  const bucket = Math.floor(Date.now() / 1000);
  return `${normUpper(normReq.chainId)}_${(h >>> 0).toString(16)}_${bucket}`;
}

/** @type {Map<string, { expiresAt: number, normReq: any, quote: any }>} */
const store = new Map();
/** @type {Map<string, { id: string, expiresAt: number }>} */
const byHash = new Map();

function put({ normReq, quote }) {
  const ttl = cacheMs();
  if (ttl <= 0) return null;
  const now = Date.now();
  const h = requestHash(normReq);

  // Idempotency: if same request hash already cached and still valid, reuse id.
  const existing = byHash.get(h);
  if (existing && now <= existing.expiresAt) {
    const hit = store.get(existing.id);
    if (hit && now <= hit.expiresAt) {
      return { quoteId: existing.id, requestHash: h };
    }
  }

  const id = makeQuoteId(normReq);
  const expiresAt = now + ttl;
  store.set(id, { expiresAt, normReq, quote });
  byHash.set(h, { id, expiresAt });
  return { quoteId: id, requestHash: h };
}

function get(id) {
  const key = String(id || "").trim();
  if (!key) return null;
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return { id: key, normReq: hit.normReq, quote: hit.quote };
}

function getByHash(h) {
  const key = String(h || "").trim().toLowerCase();
  if (!key) return null;
  const idx = byHash.get(key);
  if (!idx) return null;
  if (Date.now() > idx.expiresAt) {
    byHash.delete(key);
    return null;
  }
  return get(idx.id);
}

function assertSameRequest(a, b) {
  const aa = stableStringify(a);
  const bb = stableStringify(b);
  if (aa !== bb) {
    const err = new Error("quoteId does not match request parameters (stale or mismatched quote)");
    err.code = "QUOTE_MISMATCH";
    err.statusCode = 409;
    err.details = { expected: a, got: b };
    throw err;
  }
}

module.exports = {
  normalizeQuoteRequest,
  put,
  get,
  getByHash,
  requestHash,
  assertSameRequest,
};

