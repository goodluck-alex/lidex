const Decimal = require("decimal.js");
const { prisma } = require("../../lib/prisma");
const { getBalanceRow } = require("../cex/cex.balances");
const stakingService = require("../staking/staking.service");

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

const STAKE_ASSET = String(process.env.CEX_STAKE_ASSET || "LDX").trim().toUpperCase();

const POWER_BASIS = {
  CEX_LDX_AVAILABLE: "cex_ldx_available",
  CEX_LDX_STAKED: "cex_ldx_staked",
};

function d(x) {
  return new Decimal(x || 0);
}

function signalingEnabled() {
  return String(process.env.GOVERNANCE_SIGNAL_ENABLED || "true").toLowerCase() !== "false";
}

function normalizeSlug(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugOk(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 80;
}

function serializeProposal(p, extras = {}) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    powerBasis: p.powerBasis,
    status: p.status,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    ...extras,
  };
}

function acceptingVotes(p, now = new Date()) {
  if (p.status !== "active") return false;
  const t = now.getTime();
  if (p.startsAt && p.startsAt.getTime() > t) return false;
  if (p.endsAt && p.endsAt.getTime() <= t) return false;
  return true;
}

/**
 * Voting power in `CEX_STAKE_ASSET` units (decimal string).
 * @param {string} userId
 * @param {string} powerBasis
 */
async function votingPowerForUser(userId, powerBasis) {
  if (powerBasis === POWER_BASIS.CEX_LDX_STAKED) {
    const pool = await stakingService.ensureDefaultPoolAndTiers();
    const pos = await prisma.cexStakePosition.findUnique({
      where: { userId_poolId: { userId, poolId: pool.id } },
    });
    return pos ? pos.stakedAmount : "0";
  }
  if (powerBasis === POWER_BASIS.CEX_LDX_AVAILABLE) {
    const row = await getBalanceRow(null, userId, STAKE_ASSET);
    return d(row.available).plus(d(row.locked)).toString();
  }
  return "0";
}

function emptyTallies() {
  return { yes: "0", no: "0", abstain: "0", totalWeight: "0", voteCount: 0 };
}

function foldTallies(votes) {
  const out = emptyTallies();
  const tallyChoice = { yes: d(0), no: d(0), abstain: d(0) };
  for (const v of votes) {
    const w = d(v.weight);
    out.voteCount += 1;
    out.totalWeight = d(out.totalWeight).plus(w).toString();
    const c = String(v.choice).toLowerCase();
    if (c === "yes") tallyChoice.yes = tallyChoice.yes.plus(w);
    else if (c === "no") tallyChoice.no = tallyChoice.no.plus(w);
    else if (c === "abstain") tallyChoice.abstain = tallyChoice.abstain.plus(w);
  }
  out.yes = tallyChoice.yes.toString();
  out.no = tallyChoice.no.toString();
  out.abstain = tallyChoice.abstain.toString();
  return out;
}

async function resolveProposal(idOrSlug) {
  const raw = String(idOrSlug || "").trim();
  if (!raw) return null;
  return prisma.govSignalProposal.findFirst({
    where: { OR: [{ id: raw }, { slug: raw }] },
  });
}

async function listSignalsPublic() {
  if (!signalingEnabled()) return { ok: true, enabled: false, asset: STAKE_ASSET, proposals: [] };
  const rows = await prisma.govSignalProposal.findMany({
    where: { status: { in: ["active", "closed"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return {
    ok: true,
    enabled: true,
    asset: STAKE_ASSET,
    proposals: rows.map((p) =>
      serializeProposal(p, { acceptingVotes: acceptingVotes(p), powerBasisLabel: powerBasisLabel(p.powerBasis) })
    ),
  };
}

function powerBasisLabel(basis) {
  if (basis === POWER_BASIS.CEX_LDX_STAKED) return `Staked ${STAKE_ASSET} (CEX)`;
  if (basis === POWER_BASIS.CEX_LDX_AVAILABLE) return `${STAKE_ASSET} spot balance (CEX, avail + locked)`;
  return basis;
}

async function getSignalPublic(idOrSlug, userId) {
  if (!signalingEnabled()) return { ok: true, enabled: false, asset: STAKE_ASSET, proposal: null };
  const p = await resolveProposal(idOrSlug);
  if (!p || p.status === "draft") return { ok: false, error: "not found", code: "NOT_FOUND" };

  const votes = await prisma.govSignalVote.findMany({ where: { proposalId: p.id } });
  const tallies = foldTallies(votes);

  let myVote = null;
  let myPower = null;
  if (userId) {
    const v = votes.find((x) => x.userId === userId);
    if (v) myVote = { choice: v.choice, weight: v.weight, updatedAt: v.updatedAt.toISOString() };
    myPower = await votingPowerForUser(userId, p.powerBasis);
  }

  return {
    ok: true,
    enabled: true,
    asset: STAKE_ASSET,
    proposal: serializeProposal(p, {
      acceptingVotes: acceptingVotes(p),
      powerBasisLabel: powerBasisLabel(p.powerBasis),
      tallies,
      myVote,
      myPower,
    }),
  };
}

/**
 * @param {string} userId
 * @param {string} idOrSlug
 * @param {string} choice
 */
async function castVote(userId, idOrSlug, choice) {
  if (!signalingEnabled()) return { ok: false, error: "governance signaling disabled", code: "DISABLED" };
  const c = String(choice || "").trim().toLowerCase();
  if (!["yes", "no", "abstain"].includes(c)) {
    return { ok: false, error: "choice must be yes, no, or abstain", code: "BAD_REQUEST" };
  }

  const p = await resolveProposal(idOrSlug);
  if (!p || p.status === "draft") return { ok: false, error: "proposal not found", code: "NOT_FOUND" };
  if (!acceptingVotes(p)) return { ok: false, error: "voting is not open for this proposal", code: "NOT_ACCEPTING" };

  const weight = await votingPowerForUser(userId, p.powerBasis);
  if (d(weight).lte(0)) {
    return { ok: false, error: "no voting power for this proposal basis", code: "ZERO_POWER" };
  }

  await prisma.govSignalVote.upsert({
    where: { proposalId_userId: { proposalId: p.id, userId } },
    create: { proposalId: p.id, userId, choice: c, weight },
    update: { choice: c, weight },
  });

  return getSignalPublic(p.id, userId);
}

async function adminList() {
  if (!signalingEnabled()) return { ok: true, enabled: false, proposals: [] };
  const rows = await prisma.govSignalProposal.findMany({ orderBy: { createdAt: "desc" } });
  return { ok: true, enabled: true, proposals: rows.map((p) => serializeProposal(p)) };
}

/**
 * @param {Record<string, unknown>} body
 */
async function adminCreate(body) {
  if (!signalingEnabled()) return { ok: false, error: "governance signaling disabled", code: "DISABLED" };
  const slug = normalizeSlug(body.slug);
  if (!slugOk(slug)) {
    return { ok: false, error: "slug must be 2–80 chars, lowercase letters, digits, hyphens", code: "BAD_REQUEST" };
  }
  const title = String(body.title || "").trim().slice(0, 300);
  if (!title) return { ok: false, error: "title is required", code: "BAD_REQUEST" };

  const basis = String(body.powerBasis || "").trim();
  if (![POWER_BASIS.CEX_LDX_AVAILABLE, POWER_BASIS.CEX_LDX_STAKED].includes(basis)) {
    return {
      ok: false,
      error: `powerBasis must be ${POWER_BASIS.CEX_LDX_AVAILABLE} or ${POWER_BASIS.CEX_LDX_STAKED}`,
      code: "BAD_REQUEST",
    };
  }

  const description = body.description != null ? String(body.description).slice(0, 20000) : null;
  const status = String(body.status || "draft").trim().toLowerCase();
  if (!["draft", "active", "closed"].includes(status)) {
    return { ok: false, error: "status must be draft, active, or closed", code: "BAD_REQUEST" };
  }

  let startsAt = null;
  let endsAt = null;
  if (body.startsAt) {
    const t = new Date(String(body.startsAt));
    if (!Number.isFinite(t.getTime())) return { ok: false, error: "invalid startsAt", code: "BAD_REQUEST" };
    startsAt = t;
  }
  if (body.endsAt) {
    const t = new Date(String(body.endsAt));
    if (!Number.isFinite(t.getTime())) return { ok: false, error: "invalid endsAt", code: "BAD_REQUEST" };
    endsAt = t;
  }

  try {
    const row = await prisma.govSignalProposal.create({
      data: { slug, title, description, powerBasis: basis, status, startsAt, endsAt },
    });
    return { ok: true, proposal: serializeProposal(row) };
  } catch (e) {
    if (e.code === "P2002") return { ok: false, error: "slug already exists", code: "CONFLICT" };
    throw e;
  }
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
async function adminPatch(id, body) {
  if (!signalingEnabled()) return { ok: false, error: "governance signaling disabled", code: "DISABLED" };
  const rid = String(id || "").trim();
  if (!rid) return { ok: false, error: "id required", code: "BAD_REQUEST" };

  const data = {};
  if (body.title !== undefined) {
    const title = String(body.title || "").trim().slice(0, 300);
    if (!title) return { ok: false, error: "title cannot be empty", code: "BAD_REQUEST" };
    data.title = title;
  }
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 20000) : null;
  if (body.status != null) {
    const s = String(body.status).trim().toLowerCase();
    if (!["draft", "active", "closed"].includes(s)) return { ok: false, error: "invalid status", code: "BAD_REQUEST" };
    data.status = s;
  }
  if (body.powerBasis != null) {
    const basis = String(body.powerBasis).trim();
    if (![POWER_BASIS.CEX_LDX_AVAILABLE, POWER_BASIS.CEX_LDX_STAKED].includes(basis)) {
      return { ok: false, error: "invalid powerBasis", code: "BAD_REQUEST" };
    }
    data.powerBasis = basis;
  }
  if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;

  if (Object.keys(data).length === 0) return { ok: false, error: "no updates", code: "BAD_REQUEST" };

  try {
    const row = await prisma.govSignalProposal.update({ where: { id: rid }, data });
    return { ok: true, proposal: serializeProposal(row) };
  } catch (e) {
    if (e.code === "P2025") return { ok: false, error: "not found", code: "NOT_FOUND" };
    throw e;
  }
}

module.exports = {
  signalingEnabled,
  POWER_BASIS,
  STAKE_ASSET,
  listSignalsPublic,
  getSignalPublic,
  castVote,
  adminList,
  adminCreate,
  adminPatch,
  acceptingVotes,
};
