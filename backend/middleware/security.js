const rateLimit = require("express-rate-limit");
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
    allowedHeaders: ["Content-Type", "X-Lidex-Mode"],
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

module.exports = {
  createCors,
  securityHeaders,
  authLimiter,
  swapQuoteLimiter,
  swapExecuteLimiter,
  parseAllowedOrigins,
};
