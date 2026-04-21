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

function referralVerifyMinAgeMs() {
  const n = Number(process.env.REFERRAL_VERIFY_MIN_MS);
  if (Number.isFinite(n) && n >= 0) return n;
  return 24 * 60 * 60 * 1000;
}

async function resolveReferrerFromRefCode(refCode) {
  const raw = String(refCode || "").trim();
  if (!raw || raw.length > 128) return null;
  if (isAddressLike(raw)) {
    return prisma.user.findUnique({ where: { address: normalizeAddress(raw) } });
  }
  return prisma.user.findFirst({
    where: { referralCode: { equals: raw, mode: "insensitive" } },
  });
}

/**
 * @param {{ refCode: string, referredUser: { id: string, address: string, referralParent?: string|null } }} p
 */
async function recordReferral({ refCode, referredUser }) {
  if (!referredUser?.id || !referredUser?.address) throw new Error("not authenticated");
  const referredWallet = normalizeAddress(referredUser.address);

  const referrer = await resolveReferrerFromRefCode(refCode);
  if (!referrer) return { ok: false, error: "referrer not found" };

  const referrerWallet = normalizeAddress(referrer.address);
  if (referrerWallet === referredWallet) return { ok: false, error: "cannot refer yourself" };
  if (referrer.id === referredUser.id) return { ok: false, error: "cannot refer yourself" };

  if (referredUser.referralParent) {
    return { ok: true, recorded: false, reason: "already_attached", referrerAddress: referrerWallet };
  }

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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: referredUser.id, referralParentAddress: null },
        data: { referralParentAddress: referrerWallet },
      });

      if (updated.count !== 1) {
        return { recorded: false, referral: null };
      }

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

    return {
      ok: true,
      recorded: result.recorded,
      referral: result.referral,
      referrerAddress: referrerWallet,
    };
  } catch (e) {
    if (e?.code === "P2002") {
      return { ok: false, error: "referral already recorded for this wallet" };
    }
    throw e;
  }
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

  const minAgeMs = referralVerifyMinAgeMs();
  const delayOk = ts.getTime() - referral.createdAt.getTime() >= minAgeMs;

  const walletAgeOk = referral.referred.createdAt <= new Date(ts.getTime() - 24 * 60 * 60 * 1000);
  const recentActivityCount = await activityService.countRecent({
    walletAddress: referredWallet,
    since: referral.createdAt,
  });
  const activityOk = recentActivityCount > 0;
  const validationOk = walletAgeOk || activityOk;

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
  await prisma.referralCheck.upsert({
    where: { referralId_checkType: { referralId: referral.id, checkType: "delay" } },
    create: { referralId: referral.id, checkType: "delay", status: delayOk ? "pass" : "fail" },
    update: { status: delayOk ? "pass" : "fail", checkedAt: ts },
  });

  if (!delayOk || !validationOk) {
    return { ok: true, referral, validated: false, reason: "waiting" };
  }

  const unlockAt = new Date(ts.getTime() + 7 * 24 * 60 * 60 * 1000);
  const verified = await prisma.$transaction(async (tx) => {
    const upd = await tx.referral.updateMany({
      where: { id: referral.id, status: "pending" },
      data: { status: "verified", verifiedAt: ts },
    });
    if (upd.count !== 1) return null;

    const existing = await tx.reward.findFirst({ where: { referralId: referral.id, source: "referral" } });
    if (existing) {
      return { referral: await tx.referral.findUnique({ where: { id: referral.id } }), reward: existing };
    }

    const reward = await rewardEngine.createPendingRewardInTransaction(tx, {
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
