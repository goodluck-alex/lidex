const referralModel = require("./referral.model");
const referralLedger = require("./referral.ledger");
const referralGraph = require("./referral.graph");
const referralEngine = require("./referral.engine");
const { prisma } = require("../../lib/prisma");
const ambassadorService = require("../ambassador/ambassador.service");

async function link({ user }) {
  return {
    ok: true,
    link: referralModel.linkForUser(user),
    code: user?.address ? referralModel.codeForAddress(user.address) : null,
    user: user || null,
  };
}

async function stats({ user }) {
  const stats = referralModel.emptyStats();
  const ledger = user?.address ? await referralLedger.listByUserAddress(user.address) : [];

  // New system: “earnedUsd” is not derived from referral ledger (it’s token-based rewards).
  // Keep the field for backwards-compatible UI; report unlocked + locked LDX as USD=0 for now.
  stats.earnedUsd = 0;

  if (user?.address) {
    const a = String(user.address).toLowerCase();
    const referred = await referralGraph.listDirectReferrals(a);
    stats.direct = referred.length;
    stats.level = referralGraph.levelFromDirectCount(referred.length);
    stats.referredUsers = referred.map((r) => ({
      address: r.childAddress,
      attachedAt: r.attachedAt,
    }));
  } else {
    stats.referredUsers = [];
  }

  return { ok: true, stats, ledger, user: user || null };
}

async function users({ user }) {
  if (!user?.address) return { ok: true, users: [], user: null };
  const list = await referralGraph.listDirectReferrals(user.address);
  return {
    ok: true,
    users: list.map((r) => ({ address: r.childAddress, attachedAt: r.attachedAt })),
    user,
  };
}

async function attach({ user, refCode }) {
  if (!user?.address) return { ok: false, error: "not authenticated" };
  const raw = String(refCode || "").trim();
  if (raw.length > 128) return { ok: false, error: "invalid ref code" };

  const result = await referralEngine.recordReferral({ referrerAddress: raw, referredUser: user });
  if (!result.ok) return result;

  // Keep Phase-1 attachment edge for UI/legacy stats until those screens are upgraded.
  const parentAddress = String(raw).toLowerCase();
  const childAddr = String(user.address).toLowerCase();
  void referralGraph.recordAttachment(parentAddress, childAddr).catch(() => {});
  void ambassadorService.onReferralAttached(parentAddress, childAddr);

  // Best-effort validation attempt (may remain pending until 24h or activity).
  if (result.referral?.id) void referralEngine.validateReferral({ referralId: result.referral.id }).catch(() => {});

  // Fetch current parent for response compatibility.
  const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
  const referralParent = refreshed?.referralParentAddress ? String(refreshed.referralParentAddress).toLowerCase() : null;
  return { ok: true, attached: Boolean(result.recorded), referralParent };
}

module.exports = { link, stats, users, attach };
