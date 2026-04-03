const crypto = require("crypto");

const VALID_ROLES = new Set(["super", "listings", "treasury_read", "audit_read"]);

/** @type {Array<{ key: string; roles: string[] }> | null} */
let _registryCache = null;

function invalidateRegistryCache() {
  _registryCache = null;
}

/**
 * @param {unknown} raw
 * @returns {Array<{ key: string; roles: string[] }>}
 */
function normalizeRegistryArray(raw) {
  if (!Array.isArray(raw)) throw new Error("ADMIN_API_KEYS_JSON must be a JSON array");
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") throw new Error("each ADMIN_API_KEYS_JSON entry must be an object");
    const key = String(entry.key || "").trim();
    if (!key) throw new Error("each entry needs non-empty key");
    const rolesRaw = entry.roles;
    if (!Array.isArray(rolesRaw) || rolesRaw.length === 0) throw new Error("each entry needs roles: string[]");
    const roles = [];
    for (const r of rolesRaw) {
      const role = String(r || "").trim();
      if (!VALID_ROLES.has(role)) throw new Error(`invalid role: ${role}`);
      if (!roles.includes(role)) roles.push(role);
    }
    out.push({ key, roles });
  }
  if (out.length === 0) throw new Error("ADMIN_API_KEYS_JSON array is empty");
  return out;
}

/**
 * Registered admin keys and roles. See docs/admin-authz.md.
 * @returns {Array<{ key: string; roles: string[] }>}
 */
function loadAdminKeyRegistry() {
  if (_registryCache) return _registryCache;
  const json = String(process.env.ADMIN_API_KEYS_JSON || "").trim();
  if (json) {
    try {
      const parsed = JSON.parse(json);
      _registryCache = normalizeRegistryArray(parsed);
      return _registryCache;
    } catch (e) {
      invalidateRegistryCache();
      throw e;
    }
  }
  const legacy = String(process.env.ADMIN_API_KEY || "").trim();
  _registryCache = legacy ? [{ key: legacy, roles: ["super"] }] : [];
  return _registryCache;
}

function constantTimeEqualString(a, b) {
  const ba = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * @param {string} presented
 * @returns {{ key: string; roles: string[] } | null}
 */
function matchAdminKey(presented) {
  const p = String(presented || "").trim();
  if (!p) return null;
  let registry;
  try {
    registry = loadAdminKeyRegistry();
  } catch {
    return null;
  }
  for (const row of registry) {
    if (constantTimeEqualString(p, row.key)) return row;
  }
  return null;
}

function fingerprintForKey(secret) {
  const key = String(secret || "").trim();
  if (!key) return null;
  return crypto.createHash("sha256").update(key, "utf8").digest("hex").slice(0, 8);
}

function isMutationMethod(method) {
  const m = String(method || "").toUpperCase();
  return m === "POST" || m === "PATCH" || m === "DELETE";
}

function isListingsApplicationPatch(method, pathname) {
  return (
    String(method || "").toUpperCase() === "PATCH" &&
    /^\/v1\/admin\/listings\/applications\/[^/]+$/u.test(String(pathname || ""))
  );
}

/**
 * Phase F/G matrix: `super` — all routes. `listings` — GET under /listings + PATCH approve/reject application.
 * `treasury_read` — GET users + cex overview only.
 * `audit_read` — GET `/v1/admin/audit-logs` only.
 * @param {string[]} roles
 * @param {string} method
 * @param {string} pathname — `req.path`
 */
function adminRolesAuthorize(roles, method, pathname) {
  const path = String(pathname || "");
  if (roles.includes("super")) return true;
  if (roles.includes("listings") && isListingsApplicationPatch(method, path)) return true;
  if (isMutationMethod(method)) return false;
  const m = String(method || "").toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  if (roles.includes("audit_read") && path === "/v1/admin/audit-logs") return true;
  if (roles.includes("listings") && path.startsWith("/v1/admin/listings")) return true;
  if (
    roles.includes("treasury_read") &&
    (path.startsWith("/v1/admin/users") || path === "/v1/admin/cex/overview")
  ) {
    return true;
  }
  return false;
}

function ipToUint32(ip) {
  const parts = String(ip)
    .split(".")
    .map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return NaN;
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

function ipMatchesCidr(ip, cidr) {
  const [net, bitsRaw] = String(cidr).split("/");
  const bits = parseInt(bitsRaw, 10);
  if (!Number.isFinite(bits) || bits < 0 || bits > 32) return false;
  const ipN = ipToUint32(ip);
  const netN = ipToUint32(net.trim());
  if (!Number.isFinite(ipN) || !Number.isFinite(netN)) return false;
  const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (ipN & mask) === (netN & mask);
}

/**
 * When `ADMIN_IP_ALLOWLIST` is non-empty, request IP must match at least one rule
 * (exact IPv4 or `addr/nn` CIDR). Requires `trust proxy` for correct `req.ip` behind load balancers.
 */
function adminIpAllowed(req) {
  const raw = String(process.env.ADMIN_IP_ALLOWLIST || "").trim();
  if (!raw) return true;
  const rules = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!rules.length) return true;
  const ip = String(req.ip || "").trim();
  if (!ip) return false;
  return rules.some((rule) => {
    if (rule.includes("/")) return ipMatchesCidr(ip, rule);
    return rule === ip;
  });
}

/**
 * Validates optional `X-Admin-Approver-Key` (dual-control hint). Mutating requests may carry a second key.
 * @param {import("express").Request} req
 * @param {{ key: string }} primaryRow
 * @returns {{ ok: true } | { ok: false, status: number, body: object }}
 */
function registerAdminApproverKey(req, primaryRow) {
  const approverHdr = String(req.headers["x-admin-approver-key"] || "").trim();
  if (!approverHdr) return { ok: true };
  const row2 = matchAdminKey(approverHdr);
  if (!row2) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, error: "invalid approver key", code: "UNAUTHORIZED_APPROVER" },
    };
  }
  if (constantTimeEqualString(primaryRow.key, row2.key)) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "approver key must differ from primary key", code: "BAD_REQUEST" },
    };
  }
  req.approverKeyFingerprint = fingerprintForKey(row2.key);
  return { ok: true };
}

module.exports = {
  loadAdminKeyRegistry,
  matchAdminKey,
  fingerprintForKey,
  adminRolesAuthorize,
  adminIpAllowed,
  invalidateRegistryCache,
  registerAdminApproverKey,
  VALID_ROLES,
};
