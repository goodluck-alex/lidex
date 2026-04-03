
/**
 * First two path segments after `/v1/admin`, e.g. `governance/signals`.
 * @param {string} pathname — pathname only, no query
 */
function deriveResource(pathname) {
  const p = String(pathname || "").split("?")[0];
  const parts = p.split("/").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "v1" || parts[1] !== "admin") return null;
  const segs = parts.slice(2, 4);
  return segs.length ? segs.join("/") : null;
}

/**
 * Logs one row per POST/PATCH/DELETE under `/v1/admin` after the response is sent (no body stored).
 * @param {{ prisma: import("@prisma/client").PrismaClient }} deps
 */
function createAdminMutationAuditMiddleware({ prisma }) {
  if (!prisma) {
    return function adminAuditNoop(_req, _res, next) {
      next();
    };
  }

  return function adminMutationAudit(req, res, next) {
    if (!req.path.startsWith("/v1/admin")) return next();
    if (!["POST", "PATCH", "DELETE"].includes(req.method)) return next();

    res.on("finish", () => {
      void (async () => {
        try {
          const path = String(req.originalUrl || req.url || "").slice(0, 1024);
          const pathname = path.split("?")[0];
          const ticket = String(req.headers["x-support-ticket-id"] || "").trim().slice(0, 128);
          await prisma.adminAuditLog.create({
            data: {
              method: req.method,
              path,
              statusCode: res.statusCode,
              keyFingerprint: req.adminKeyFingerprint ?? null,
              resource: deriveResource(pathname),
              ip: req.ip || null,
              supportTicketId: ticket || null,
              approverKeyFingerprint: req.approverKeyFingerprint ?? null,
            },
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[admin-audit]", e?.message || e);
        }
      })();
    });

    next();
  };
}

module.exports = { createAdminMutationAuditMiddleware, deriveResource };
