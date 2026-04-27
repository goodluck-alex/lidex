function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : fallback;
}

function breakerEnabled() {
  return String(process.env.SWAP_BREAKER_ENABLED || "true").toLowerCase() !== "false";
}

function failureThreshold() {
  return Math.max(1, intEnv("SWAP_BREAKER_FAIL_THRESHOLD", 5));
}

function openMs() {
  return Math.max(1000, intEnv("SWAP_BREAKER_OPEN_MS", 20_000));
}

/** @type {Map<string, { fails: number, openedAt: number|null }>} */
const state = new Map();

function getState(key) {
  const hit = state.get(key);
  if (hit) return hit;
  const s = { fails: 0, openedAt: null };
  state.set(key, s);
  return s;
}

function isOpen(key) {
  if (!breakerEnabled()) return false;
  const s = getState(key);
  if (!s.openedAt) return false;
  if (Date.now() - s.openedAt > openMs()) {
    s.openedAt = null;
    s.fails = 0;
    return false;
  }
  return true;
}

function recordSuccess(key) {
  const s = getState(key);
  s.fails = 0;
  s.openedAt = null;
}

function recordFailure(key) {
  if (!breakerEnabled()) return;
  const s = getState(key);
  s.fails += 1;
  if (s.fails >= failureThreshold() && !s.openedAt) {
    s.openedAt = Date.now();
  }
}

function makeOpenError(key) {
  const err = new Error(`swap provider temporarily disabled (${key})`);
  err.code = "AGGREGATOR_DOWN";
  err.statusCode = 503;
  err.details = { breaker: "open", provider: key };
  return err;
}

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} fn
 */
async function withBreaker(key, fn) {
  if (isOpen(key)) throw makeOpenError(key);
  try {
    const out = await fn();
    recordSuccess(key);
    return out;
  } catch (e) {
    // treat these as failures
    recordFailure(key);
    throw e;
  }
}

module.exports = { withBreaker, isOpen };

