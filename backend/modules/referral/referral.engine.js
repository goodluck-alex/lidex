const { prisma } = require("../../lib/prisma");
const rewardEngine = require("../rewards/reward.engine");
const activityService = require("../activity/activity.service");

function normalizeAddress(a) {
  return String(a || "").toLowerCase();
}

function isAddressLike(a) {
  const s = normalizeAddress(a);
  return s.startsWith("0x") && s.length === 42;
}

async function recordReferral({ referrerAddress, referredUser }) {
  if (!referredUser?.id || !referredUser?.address) throw new Error("not authenticated");
  const referrerWallet = normalizeAddress(referrerAddress);
  const referredWallet = normalizeAddress(referredUser.address);
  if (!isAddressLike(referrerWallet)) return { ok: false, error: "invalid ref code" };
  if (referrerWallet === referredWallet) return { ok: false, error: "cannot refer yourself" };

  const referrer = await prisma.user.findUnique({ where: { address: referrerWallet } });
  if (!referrer) return { ok: false, error: "referrer not found" };

  // If already has a parent, keep current behavior (first referral wins).
  if (referredUser.referralParent) {
    return { ok: true, recorded: false, reason: "already_attached" };
  }

  // Enforce a strict “tree”: no cycles (walk up the referrer chain; depth cap for safety).
  const maxDepth = 32;
  let cursor = referrer;
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const parent = cursor.referralParentAddress ? normalizeAddress(cursor.referralParentAddress) : null;
    if (!parent) break;
    if (parent === referredWallet) return { ok: false, error: "referral cycle rejected" };
    const next = await prisma.user.findUnique({ where: { address: parent } });
    if (!next) break;
    cursor = next;
  }

  // Transaction: set user parent once + create referral row once.
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: referredUser.id, referralParentAddress: null },
      data: { referralParentAddress: referrerWallet },
    });

    // If concurrent attach happened, keep idempotent behavior.
    if (updated.count !== 1) {
      return { recorded: false, referral: null };
    }

    // One referral per referred user (unique by referredUserId).
    const referral = await tx.referral.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId: referredUser.id,
        status: "pending",
        pendingRewardLdx: "10",
      },
    });

    return { recorded: true, referral };
  });

  return { ok: true, recorded: result.recorded, referral: result.referral };
}

async function validateReferral({ referralId, now = new Date() } = {}) {
  const ts = now instanceof Date ? now : new Date(now);
  const referral = await prisma.referral.findUnique({
    where: { id: String(referralId) },
    include: { referrer: true, referred: true, checks: true },
  });
  if (!referral) return { ok: false, error: "referral not found" };
  if (referral.status !== "pending") return { ok: true, referral, validated: false, reason: "not_pending" };

  const referrerWallet = normalizeAddress(referral.referrer.address);
  const referredWallet = normalizeAddress(referral.referred.address);
  if (referrerWallet === referredWallet) {
    await prisma.referral.update({ where: { id: referral.id }, data: { status: "rejected" } });
    return { ok: true, referral: { ...referral, status: "rejected" }, validated: true, reason: "self" };
  }

  // Anti-bot heuristics (MVP): must be 24h old OR show activity (login/swap/trade) after attach.
  const walletAgeOk = referral.referred.createdAt <= new Date(ts.getTime() - 24 * 60 * 60 * 1000);
  const recentActivityCount = await activityService.countRecent({
    walletAddress: referredWallet,
    since: referral.createdAt,
  });
  const activityOk = recentActivityCount > 0;

  // Upsert check rows (idempotent).
  await prisma.referralCheck.upsert({
    where: { referralId_checkType: { referralId: referral.id, checkType: "wallet_age" } },
    create: { referralId: referral.id, checkType: "wallet_age", status: walletAgeOk ? "pass" : "fail" },
    update: { status: walletAgeOk ? "pass" : "fail", checkedAt: ts },
  });
  await prisma.referralCheck.upsert({
    where: { referralId_checkType: { referralId: referral.id, checkType: "activity" } },
    create: { referralId: referral.id, checkType: "activity", status: activityOk ? "pass" : "fail" },
    update: { status: activityOk ? "pass" : "fail", checkedAt: ts },
  });

  if (!walletAgeOk && !activityOk) {
    return { ok: true, referral, validated: false, reason: "waiting" };
  }

  // Approve: mark verified and create a pending reward (10 LDX) that unlocks later.
  const unlockAt = new Date(ts.getTime() + 7 * 24 * 60 * 60 * 1000); // MVP: 7d cliff
  const verified = await prisma.$transaction(async (tx) => {
    const upd = await tx.referral.updateMany({
      where: { id: referral.id, status: "pending" },
      data: { status: "verified", verifiedAt: ts },
    });
    if (upd.count !== 1) return null;

    // Prevent duplicate rewards for same referral.
    const existing = await tx.reward.findFirst({ where: { referralId: referral.id, source: "referral" } });
    if (existing) return { referral: await tx.referral.findUnique({ where: { id: referral.id } }), reward: existing };

    const reward = await rewardEngine.createPendingReward({
      userId: referral.referrerUserId,
      walletAddress: referrerWallet,
      source: "referral",
      amountLdx: referral.pendingRewardLdx || "10",
      unlockAt,
      referralId: referral.id,
    });
    const r2 = await tx.referral.findUnique({ where: { id: referral.id } });
    return { referral: r2, reward };
  });

  if (!verified) return { ok: true, referral, validated: false, reason: "race" };
  return { ok: true, referral: verified.referral, reward: verified.reward, validated: true, reason: "verified" };
}

async function validatePendingReferralsForWallet({ walletAddress }) {
  const wallet = normalizeAddress(walletAddress);
  const user = await prisma.user.findUnique({ where: { address: wallet } });
  if (!user) return { ok: true, validated: 0 };
  const pending = await prisma.referral.findMany({ where: { referredUserId: user.id, status: "pending" } });
  let validated = 0;
  for (const r of pending) {
    const res = await validateReferral({ referralId: r.id });
    if (res.validated) validated += 1;
  }
  return { ok: true, validated };
}

module.exports = { recordReferral, validateReferral, validatePendingReferralsForWallet };

