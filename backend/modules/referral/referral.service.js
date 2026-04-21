const referralModel = require("./referral.model");
const referralLedger = require("./referral.ledger");
const referralGraph = require("./referral.graph");
const referralEngine = require("./referral.engine");
const { prisma } = require("../../lib/prisma");
const usersModel = require("../users/users.model");
const ambassadorService = require("../ambassador/ambassador.service");

async function link({ user }) {
  if (!user?.id || !user?.address) {
    return { ok: false, error: "not authenticated" };
  }
  await usersModel.ensureReferralCodeForUserId(user.id);
  const full = await prisma.user.findUnique({ where: { id: user.id } });
  const mapped = usersModel.mapUser(full);
  if (!mapped?.referralCode) {
    return { ok: false, error: "referral code unavailable" };
  }
  return {
    ok: true,
    link: referralModel.linkFromStoredReferralCode(mapped.referralCode),
    code: mapped.referralCode,
    user: mapped,
  };
}

async function stats({ user }) {
  const stats = referralModel.emptyStats();
  const ledger = user?.address ? await referralLedger.listByUserAddress(user.address) : [];

  stats.earnedUsd = 0;

  let pendingReferrals = [];
  let ldxRewards = [];

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

  if (user?.id) {
    const pr = await prisma.referral.findMany({
      where: { referrerUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { referred: { select: { address: true } } },
    });
    pendingReferrals = pr
      .filter((r) => r.status === "pending")
      .map((r) => ({
        id: r.id,
        referredAddress: String(r.referred.address).toLowerCase(),
        pendingRewardLdx: r.pendingRewardLdx,
        status: r.status,
        createdAt: r.createdAt.getTime(),
      }));

    const rewards = await prisma.reward.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    ldxRewards = rewards.map((rw) => ({
      id: rw.id,
      source: rw.source,
      ldxAmount: rw.ldxAmount,
      status: rw.status,
      referralId: rw.referralId,
      unlockAt: rw.unlockAt ? rw.unlockAt.getTime() : null,
      createdAt: rw.createdAt.getTime(),
    }));
  }

  return { ok: true, stats, ledger, user: user || null, pendingReferrals, ldxRewards };
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

  const result = await referralEngine.recordReferral({ refCode: raw, referredUser: user });
  if (!result.ok) return result;

  const referrerWallet = result.referrerAddress ? String(result.referrerAddress).toLowerCase() : null;
  const childAddr = String(user.address).toLowerCase();
  if (result.recorded && referrerWallet) {
    void referralGraph.recordAttachment(referrerWallet, childAddr).catch(() => {});
    void ambassadorService.onReferralAttached(referrerWallet, childAddr);
  }

  if (result.referral?.id) void referralEngine.validateReferral({ referralId: result.referral.id }).catch(() => {});

  const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
  const referralParent = refreshed?.referralParentAddress ? String(refreshed.referralParentAddress).toLowerCase() : null;
  return { ok: true, attached: Boolean(result.recorded), referralParent };
}

module.exports = { link, stats, users, attach };
