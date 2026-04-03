const { prisma } = require("../../lib/prisma");
const { getUserById, getUserByAddress } = require("../users/users.model");
const { publicConfig } = require("../cex/cex.config");
const { getBalanceRow, d, CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("../cex/cex.balances");

function manualCexLedgerEnabled() {
  return String(process.env.ADMIN_MANUAL_LEDGER_ENABLED || "").toLowerCase() === "true";
}

function assertAllowedCexAsset(asset) {
  const a = String(asset || "").trim().toUpperCase();
  if (a !== CEX_BASE_ASSET && a !== CEX_QUOTE_ASSET) {
    const err = new Error(`asset must be ${CEX_BASE_ASSET} or ${CEX_QUOTE_ASSET}`);
    err.code = "BAD_ASSET";
    throw err;
  }
  return a;
}

/**
 * @param {string} userId
 * @param {{ limit?: string | number; cursor?: string }} q
 */
async function adminGetUserById(userId, q) {
  const user = await getUserById(userId);
  if (!user) return { ok: false, code: "NOT_FOUND", error: "user not found" };

  const balanceRows = await prisma.cexBalance.findMany({
    where: { userId: user.id },
    orderBy: { asset: "asc" },
    select: { asset: true, available: true, locked: true, updatedAt: true },
  });

  const take = Math.min(200, Math.max(1, Number(q?.limit) || 50));
  const cursor = q?.cursor != null && String(q.cursor).trim() ? String(q.cursor).trim() : null;

  const entryRows = await prisma.cexLedgerEntry.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = entryRows.length > take;
  const slice = hasMore ? entryRows.slice(0, take) : entryRows;
  const nextCursor = hasMore && slice.length ? slice[slice.length - 1].id : null;

  return {
    ok: true,
    user,
    balances: balanceRows.map((b) => ({
      asset: b.asset,
      available: b.available,
      locked: b.locked,
      updatedAt: b.updatedAt.toISOString(),
    })),
    ledger: {
      entries: slice.map((e) => ({
        id: e.id,
        kind: e.kind,
        asset: e.asset,
        deltaAvail: e.deltaAvail,
        refTxHash: e.refTxHash,
        createdAt: e.createdAt.toISOString(),
      })),
      nextCursor,
    },
  };
}

async function adminResolveUserByAddress(rawAddress) {
  const user = await getUserByAddress(rawAddress);
  if (!user) return { ok: false, code: "NOT_FOUND", error: "user not found" };
  return { ok: true, userId: user.id, address: user.address };
}

async function adminCexOverview() {
  const cfg = publicConfig();
  const openOrdersCount = await prisma.cexOrder.count({
    where: { status: { in: ["open", "partial", "pending_stop"] } },
  });
  const usersCount = await prisma.user.count();
  let liquidityPoolsCount = null;
  try {
    liquidityPoolsCount = await prisma.cexLiquidityPool.count();
  } catch {
    liquidityPoolsCount = null;
  }

  return {
    ok: true,
    matcherSymbol: cfg.symbol,
    baseAsset: cfg.baseAsset,
    quoteAsset: cfg.quoteAsset,
    openOrdersCount,
    usersCount,
    liquidityPoolsCount,
    limits: cfg.limits,
    features: cfg.features,
  };
}

/**
 * Phase G — rare manual available-balance delta (custodial). **super** + env + dual approver + ticket only.
 * @param {Record<string, unknown>} body
 * @param {{ approverKeyFingerprint?: string | null; headers: { [k: string]: unknown } }} reqLike
 */
async function adminManualCexLedgerAdjust(body, reqLike) {
  if (!manualCexLedgerEnabled()) {
    return {
      ok: false,
      code: "DISABLED",
      error: "ADMIN_MANUAL_LEDGER_ENABLED is not true",
    };
  }
  if (!reqLike.approverKeyFingerprint) {
    return {
      ok: false,
      code: "DUAL_CONTROL_REQUIRED",
      error: "X-Admin-Approver-Key must be a second valid admin key",
    };
  }

  const headerTicket = String(reqLike.headers["x-support-ticket-id"] || "").trim();
  const userId = String(body?.userId || "").trim();
  const ticketId = String(body?.ticketId || "").trim();
  const deltaRaw = String(body?.deltaAvail ?? "").trim();
  const reason = body?.reason != null ? String(body.reason).trim().slice(0, 2000) : "";

  if (!headerTicket) {
    return { ok: false, code: "BAD_REQUEST", error: "X-Support-Ticket-Id header required" };
  }
  if (!ticketId || headerTicket !== ticketId) {
    return {
      ok: false,
      code: "BAD_REQUEST",
      error: "body.ticketId must match X-Support-Ticket-Id header",
    };
  }
  if (!userId) return { ok: false, code: "BAD_REQUEST", error: "userId required" };
  if (!deltaRaw) return { ok: false, code: "BAD_REQUEST", error: "deltaAvail required (decimal string, can be negative)" };

  let asset;
  try {
    asset = assertAllowedCexAsset(body?.asset);
  } catch (e) {
    return { ok: false, code: "BAD_ASSET", error: e?.message || "bad asset" };
  }

  let delta;
  try {
    delta = d(deltaRaw);
  } catch {
    return { ok: false, code: "BAD_REQUEST", error: "deltaAvail must be a decimal" };
  }
  if (delta.isZero()) {
    return { ok: false, code: "BAD_REQUEST", error: "deltaAvail must be non-zero" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { ok: false, code: "NOT_FOUND", error: "user not found" };

  const refTxHash = `admin_ticket:${ticketId.slice(0, 240)}${reason ? `|${reason.slice(0, 200)}` : ""}`.slice(0, 1000);

  try {
    const bal = await prisma.$transaction(async (tx) => {
      const row = await getBalanceRow(tx, userId, asset);
      const next = d(row.available).plus(delta);
      if (next.lt(0)) {
        const err = new Error(`insufficient ${asset} available for this debit`);
        err.code = "INSUFFICIENT_FUNDS";
        throw err;
      }
      await tx.cexBalance.update({
        where: { id: row.id },
        data: { available: next.toString() },
      });
      await tx.cexLedgerEntry.create({
        data: {
          userId,
          kind: "admin_manual_adjust",
          asset,
          deltaAvail: delta.toString(),
          refTxHash,
        },
      });
      return tx.cexBalance.findUnique({ where: { id: row.id } });
    });
    return {
      ok: true,
      ticketId,
      userId,
      asset,
      deltaAvail: delta.toString(),
      balance: {
        available: bal.available,
        locked: bal.locked,
      },
    };
  } catch (e) {
    if (e?.code === "INSUFFICIENT_FUNDS") {
      return { ok: false, code: "INSUFFICIENT_FUNDS", error: e.message };
    }
    throw e;
  }
}

/**
 * Cursor list of operator mutation audit rows (`admin_api_audit_logs`). **super** only via authz (path not in other roles).
 * @param {{ limit?: string | number; cursor?: string; resource?: string; method?: string }} q
 */
async function adminListAuditLogs(q) {
  const take = Math.min(500, Math.max(1, Number(q?.limit) || 50));
  const cursor = q?.cursor != null && String(q.cursor).trim() ? String(q.cursor).trim() : null;
  const resource =
    q?.resource != null && String(q.resource).trim() ? String(q.resource).trim().slice(0, 200) : null;
  const methodFilter =
    q?.method != null && String(q.method).trim() ? String(q.method).trim().toUpperCase().slice(0, 16) : null;

  const where = {};
  if (resource) where.resource = resource;
  if (methodFilter) where.method = methodFilter;

  const rows = await prisma.adminAuditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore && slice.length ? slice[slice.length - 1].id : null;

  return {
    ok: true,
    entries: slice.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      keyFingerprint: r.keyFingerprint,
      resource: r.resource,
      ip: r.ip,
      supportTicketId: r.supportTicketId,
      approverKeyFingerprint: r.approverKeyFingerprint,
    })),
    nextCursor,
  };
}

module.exports = {
  adminGetUserById,
  adminResolveUserByAddress,
  adminCexOverview,
  adminManualCexLedgerAdjust,
  manualCexLedgerEnabled,
  adminListAuditLogs,
};
