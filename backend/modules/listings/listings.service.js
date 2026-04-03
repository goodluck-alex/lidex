const { prisma } = require("../../lib/prisma");
const { maybeAutoListAfterApplication } = require("./listings.auto");
const { notifyAdminListingApplication } = require("./listings.admin-notify");

function asInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeAddress(a) {
  const s = String(a || "").trim();
  if (!s.startsWith("0x") || s.length < 42) return null;
  return s.toLowerCase();
}

function isSupportedChainId(chainId) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CHAINS } = require("@lidex/shared");
  return !!CHAINS?.byChainId?.[chainId];
}

function serializeApplicationRow(r) {
  return {
    id: r.id,
    projectName: r.projectName,
    contactEmail: r.contactEmail,
    websiteUrl: r.websiteUrl,
    chainId: r.chainId,
    tokenAddress: r.tokenAddress,
    symbol: r.symbol,
    decimals: r.decimals,
    pairWithLdx: r.pairWithLdx,
    notes: r.notes,
    automationNote: r.automationNote,
    status: r.status,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function apply({ body }) {
  const projectName = String(body?.projectName || "").trim();
  const contactEmail = body?.contactEmail ? String(body.contactEmail).trim() : null;
  const websiteUrl = body?.websiteUrl ? String(body.websiteUrl).trim() : null;
  const chainId = asInt(body?.chainId);
  const tokenAddress = normalizeAddress(body?.tokenAddress);
  const symbol = String(body?.symbol || "").trim().toUpperCase();
  const decimals = asInt(body?.decimals);
  const pairWithLdx = body?.pairWithLdx !== false;
  const notes = body?.notes ? String(body.notes).trim() : null;

  if (!projectName) return { ok: false, error: "projectName is required", code: "BAD_REQUEST" };
  if (!chainId) return { ok: false, error: "chainId is required", code: "BAD_REQUEST" };
  if (!isSupportedChainId(chainId)) return { ok: false, error: "unsupported chainId", code: "UNSUPPORTED_CHAIN" };
  if (!tokenAddress) return { ok: false, error: "tokenAddress is required", code: "BAD_REQUEST" };
  if (!symbol) return { ok: false, error: "symbol is required", code: "BAD_REQUEST" };
  if (decimals == null || decimals < 0 || decimals > 36) return { ok: false, error: "decimals must be 0..36", code: "BAD_REQUEST" };

  const row = await prisma.tokenListingApplication.create({
    data: {
      projectName,
      contactEmail,
      websiteUrl,
      chainId,
      tokenAddress,
      symbol,
      decimals,
      pairWithLdx,
      notes,
      status: "submitted",
    },
  });

  const auto = await maybeAutoListAfterApplication(row);
  const fresh = (await prisma.tokenListingApplication.findUnique({ where: { id: row.id } })) || row;

  void notifyAdminListingApplication({
    application: serializeApplicationRow(fresh),
    automation: { attempted: auto.attempted, outcome: auto.outcome },
  });

  return {
    ok: true,
    application: {
      id: fresh.id,
      status: fresh.status,
      createdAt: fresh.createdAt.getTime(),
      pairWithLdx: fresh.pairWithLdx,
      automationNote: fresh.automationNote,
      auto: { attempted: auto.attempted, outcome: auto.outcome },
    },
  };
}

async function listTokens({ chainId }) {
  const cid = asInt(chainId);
  if (!cid) return { ok: false, error: "chainId is required", code: "BAD_REQUEST" };
  const rows = await prisma.listedToken.findMany({
    where: { chainId: cid, status: "active" },
    orderBy: [{ featured: "desc" }, { symbol: "asc" }],
  });
  return {
    ok: true,
    chainId: cid,
    tokens: rows.map((r) => ({
      symbol: r.symbol,
      address: r.address,
      decimals: r.decimals,
      featured: r.featured,
      name: (r.name && String(r.name).trim()) || r.symbol,
      logoUrl: r.logoUrl || null,
    })),
  };
}

/**
 * Cursor-paginated listing applications for admin / ops (protected by ADMIN_API_KEY).
 * @param {{ status?: string; limit?: string | number; cursor?: string }} q
 */
async function listApplicationsAdmin(q) {
  const take = Math.min(Math.max(Number(q?.limit) || 50, 1), 200);
  const status = q?.status != null && String(q.status).trim() ? String(q.status).trim() : null;
  const cursor = q?.cursor != null && String(q.cursor).trim() ? String(q.cursor).trim() : null;

  const where = status ? { status } : {};

  const rows = await prisma.tokenListingApplication.findMany({
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
    applications: slice.map(serializeApplicationRow),
    nextCursor,
  };
}

async function getApplicationAdmin(id) {
  const rid = String(id || "").trim();
  if (!rid) return { ok: false, error: "id is required", code: "BAD_REQUEST" };
  const r = await prisma.tokenListingApplication.findUnique({ where: { id: rid } });
  if (!r) return { ok: false, error: "not found", code: "NOT_FOUND" };
  return { ok: true, application: serializeApplicationRow(r) };
}

/**
 * Listed-token registry rows (all statuses) for admin review.
 * @param {{ chainId?: string | number; limit?: string | number; cursor?: string }} q
 */
async function listListedTokensAdmin(q) {
  const take = Math.min(Math.max(Number(q?.limit) || 100, 1), 500);
  const chainId = q?.chainId != null && String(q.chainId).trim() ? asInt(q.chainId) : null;
  const cursor = q?.cursor != null && String(q.cursor).trim() ? String(q.cursor).trim() : null;

  const where = chainId ? { chainId } : {};

  const rows = await prisma.listedToken.findMany({
    where,
    orderBy: [{ chainId: "asc" }, { symbol: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore && slice.length ? slice[slice.length - 1].id : null;

  return {
    ok: true,
    tokens: slice.map((t) => ({
      id: t.id,
      chainId: t.chainId,
      address: t.address,
      symbol: t.symbol,
      decimals: t.decimals,
      name: (t.name && String(t.name).trim()) || t.symbol,
      logoUrl: t.logoUrl || null,
      status: t.status,
      featured: t.featured,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

const PENDING_APPROVE = new Set(["submitted"]);
const BLOCK_APPROVE = new Set(["auto_listed", "manually_listed", "auto_rejected", "manually_rejected"]);

/**
 * Phase G — manual approve (upsert listed_tokens) or reject (terminal).
 * @param {string} id
 * @param {{ decision: string; note?: string | null }} body
 */
async function patchListingApplicationAdmin(id, body) {
  const rid = String(id || "").trim();
  const decision = String(body?.decision || "").trim().toLowerCase();
  if (!rid) return { ok: false, error: "id is required", code: "BAD_REQUEST" };
  if (decision !== "approve" && decision !== "reject") {
    return { ok: false, error: "decision must be approve or reject", code: "BAD_REQUEST" };
  }
  const note =
    body?.note != null && String(body.note).trim() ? String(body.note).trim().slice(0, 4000) : null;

  const app = await prisma.tokenListingApplication.findUnique({ where: { id: rid } });
  if (!app) return { ok: false, error: "not found", code: "NOT_FOUND" };

  if (decision === "reject") {
    if (app.status === "manually_listed" || app.status === "auto_listed") {
      return { ok: false, error: "already listed", code: "CONFLICT" };
    }
    if (app.status === "manually_rejected" || app.status === "auto_rejected") {
      return { ok: false, error: "already rejected", code: "CONFLICT" };
    }
    const automationNote = note ? `Manual reject: ${note}` : app.automationNote || "Manually rejected";
    const row = await prisma.tokenListingApplication.update({
      where: { id: rid },
      data: {
        status: "manually_rejected",
        reviewedAt: new Date(),
        automationNote,
      },
    });
    return { ok: true, application: serializeApplicationRow(row) };
  }

  if (BLOCK_APPROVE.has(app.status)) {
    return {
      ok: false,
      error: "cannot approve from current status",
      code: "CONFLICT",
    };
  }
  if (!PENDING_APPROVE.has(app.status)) {
    return {
      ok: false,
      error: `approve expects status submitted (got ${app.status})`,
      code: "CONFLICT",
    };
  }

  const addr = normalizeAddress(app.tokenAddress);
  if (!addr) return { ok: false, error: "invalid token address on application", code: "BAD_REQUEST" };

  await prisma.$transaction(async (tx) => {
    await tx.listedToken.upsert({
      where: { chainId_address: { chainId: app.chainId, address: addr } },
      create: {
        chainId: app.chainId,
        address: addr,
        symbol: app.symbol,
        decimals: app.decimals,
        name: String(app.projectName || "").trim() || app.symbol,
        status: "active",
        featured: false,
      },
      update: {
        symbol: app.symbol,
        decimals: app.decimals,
        name: String(app.projectName || "").trim() || app.symbol,
        status: "active",
      },
    });
    await tx.tokenListingApplication.update({
      where: { id: rid },
      data: {
        status: "manually_listed",
        reviewedAt: new Date(),
        automationNote: note ? `Manual approve: ${note}` : null,
      },
    });
  });

  const row = await prisma.tokenListingApplication.findUnique({ where: { id: rid } });
  return { ok: true, application: serializeApplicationRow(row) };
}

module.exports = {
  apply,
  listTokens,
  listApplicationsAdmin,
  getApplicationAdmin,
  listListedTokensAdmin,
  patchListingApplicationAdmin,
};

