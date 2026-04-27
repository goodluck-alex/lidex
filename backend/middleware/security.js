const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const cors = require("cors");

/**
 * CORS + baseline headers. DEX vs CEX for `/v1/*` is enforced in `lidexMode` middleware
 * (`X-Lidex-Mode`); session cookies remain the authority for user identity.
 */
function parseAllowedOrigins() {
  const raw =
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:3001,http://127.0.0.1:3001";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function createCors() {
  const allowed = parseAllowedOrigins();
  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "X-Lidex-Mode", "Authorization", "X-Admin-Key"],
  });
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}

function jsonRateLimitExceeded(req, res, next, options) {
  res.status(options.statusCode).json({
    ok: false,
    code: "RATE_LIMITED",
    message: "too many requests",
    // backward compatibility
    error: "too many requests",
  });
}

function intEnv(name, fallback) {
  const v = parseInt(process.env[name] || String(fallback), 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: intEnv("RATE_LIMIT_AUTH_MAX", 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitExceeded,
});

const swapQuoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: intEnv("RATE_LIMIT_SWAP_QUOTE_MAX", 45),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitExceeded,
});

const swapExecuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: intEnv("RATE_LIMIT_SWAP_EXECUTE_MAX", 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitExceeded,
});

/** Phase 1 M4: all `/v1/referral/*` routes (read + write). */
const referralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: intEnv("RATE_LIMIT_REFERRAL_MAX", 120),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitExceeded,
});

/** Phase 3: CEX mutations (per signed-in user when `req.user.id` is set after requireCexUser; else per IP). */
const cexWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: intEnv("RATE_LIMIT_CEX_WRITE_MAX", 90),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitExceeded,
  keyGenerator(req) {
    if (req.user?.id) return `cexw:u:${req.user.id}`;
    return `cexw:ip:${ipKeyGenerator(req)}`;
  },
});

/** Phase 7: public token listing application. */
const listingApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: intEnv("RATE_LIMIT_LISTING_APPLY_MAX", 25),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitExceeded,
});

module.exports = {
  createCors,
  securityHeaders,
  authLimiter,
  swapQuoteLimiter,
  swapExecuteLimiter,
  referralLimiter,
  cexWriteLimiter,
  listingApplyLimiter,
  parseAllowedOrigins,
};
