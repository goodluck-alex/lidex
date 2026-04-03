const Decimal = require("decimal.js");
const stakingModel = require("./staking.model");
const { prisma } = require("../../lib/prisma");
const { getBalanceRow, d } = require("../cex/cex.balances");

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

const STAKE_ASSET = String(process.env.CEX_STAKE_ASSET || "LDX").trim().toUpperCase();

async function ensureDefaultPoolAndTiers() {
  const existing = await prisma.cexStakePool.findFirst({
    where: { asset: STAKE_ASSET, status: "active" },
  });
  if (existing) return existing;
  const pool = await prisma.cexStakePool.create({
    data: {
      asset: STAKE_ASSET,
      label: `${STAKE_ASSET} staking`,
      status: "active",
    },
  });
  const defaults = [
    { label: "Bronze", minStake: "1000", feeBps: 8, referralBoostBps: 0, isPremium: false, rank: 1 },
    { label: "Silver", minStake: "5000", feeBps: 6, referralBoostBps: 500, isPremium: false, rank: 2 },
    { label: "Gold", minStake: "20000", feeBps: 4, referralBoostBps: 1000, isPremium: true, rank: 3 },
  ];
  await prisma.cexStakeTier.createMany({
    data: defaults.map((t) => ({
      poolId: pool.id,
      label: t.label,
      minStake: t.minStake,
      feeBps: t.feeBps,
      referralBoostBps: t.referralBoostBps,
      isPremium: t.isPremium,
      rank: t.rank,
    })),
  });
  return pool;
}

async function resolveUserStakeTier(userId) {
  const pool = await ensureDefaultPoolAndTiers();
  const pos = await prisma.cexStakePosition.findUnique({
    where: { userId_poolId: { userId, poolId: pool.id } },
  });
  if (!pos) return { poolId: pool.id, tier: null };
  const tiers = await prisma.cexStakeTier.findMany({
    where: { poolId: pool.id },
    orderBy: [{ minStake: "asc" }, { rank: "asc" }],
  });
  const staked = d(pos.stakedAmount);
  let best = null;
  for (const t of tiers) {
    if (staked.gte(d(t.minStake))) best = t;
  }
  return { poolId: pool.id, tier: best };
}

function stakingFeeDiscountEnabled() {
  return String(process.env.CEX_STAKING_FEE_DISCOUNT_ENABLED || "true").toLowerCase() !== "false";
}

function stakingReferralBoostEnabled() {
  return String(process.env.CEX_STAKING_REFERRAL_BOOST_ENABLED || "true").toLowerCase() !== "false";
}

/**
 * CEX taker fee bps after staking tier discount (never above `CEX_FEE_BPS`).
 * @param {string | null | undefined} userId
 */
async function effectiveTakerFeeBpsForUser(userId) {
  const { getFeeBps } = require("../cex/cex.fees");
  const base = getFeeBps();
  if (!userId || !stakingFeeDiscountEnabled()) return base;
  const { tier } = await resolveUserStakeTier(userId);
  if (!tier || tier.feeBps == null) return base;
  const t = Number(tier.feeBps);
  if (!Number.isFinite(t) || t < 0) return base;
  const capped = Math.min(5000, Math.trunc(t));
  return Math.min(base, capped);
}

/**
 * Extra referral share in bps of integrator fee (parent/referrer), added to level1 rate, capped at 100%.
 * @param {string | null | undefined} userId
 */
async function effectiveReferralBoostBpsForUser(userId) {
  if (!userId || !stakingReferralBoostEnabled()) return 0;
  const { tier } = await resolveUserStakeTier(userId);
  if (!tier || tier.referralBoostBps == null) return 0;
  const b = Number(tier.referralBoostBps);
  if (!Number.isFinite(b) || b <= 0) return 0;
  return Math.min(10000, Math.trunc(b));
}

/** Launchpad eligibility: 0 if unstaked / below Bronze. */
async function userTierRank(userId) {
  if (!userId) return 0;
  const { tier } = await resolveUserStakeTier(userId);
  return tier && tier.rank != null ? tier.rank : 0;
}

async function pools() {
  const pool = await ensureDefaultPoolAndTiers();
  const tiers = await prisma.cexStakeTier.findMany({
    where: { poolId: pool.id },
    orderBy: { minStake: "asc" },
  });
  return {
    ok: true,
    pools: [
      {
        id: pool.id,
        asset: pool.asset,
        label: pool.label,
        tiers: tiers.map((t) => ({
          id: t.id,
          label: t.label,
          minStake: t.minStake,
          feeBps: t.feeBps,
          referralBoostBps: t.referralBoostBps,
          isPremium: t.isPremium,
        })),
      },
    ],
  };
}

async function positions({ user }) {
  if (!user?.id) return { ok: true, positions: [], user: null };
  const pool = await ensureDefaultPoolAndTiers();
  const pos = await prisma.cexStakePosition.findUnique({
    where: { userId_poolId: { userId: user.id, poolId: pool.id } },
  });
  const { tier } = await resolveUserStakeTier(user.id);
  return {
    ok: true,
    user: { id: user.id, address: user.address },
    positions: pos
      ? [
          {
            id: pos.id,
            poolId: pos.poolId,
            asset: pool.asset,
            stakedAmount: pos.stakedAmount,
            createdAt: pos.createdAt.toISOString(),
            updatedAt: pos.updatedAt.toISOString(),
          },
        ]
      : [],
    tier: tier
      ? {
          id: tier.id,
          label: tier.label,
          feeBps: tier.feeBps,
          referralBoostBps: tier.referralBoostBps,
          isPremium: tier.isPremium,
          minStake: tier.minStake,
        }
      : null,
  };
}

async function stake({ body, user }) {
  if (!user?.id) {
    return { ok: false, error: "not authenticated", code: "UNAUTHENTICATED" };
  }
  const rawAmt = body?.amount;
  const amt = d(rawAmt);
  if (!rawAmt || amt.lte(0)) {
    return { ok: false, error: "amount must be positive", code: "BAD_AMOUNT" };
  }
  const pool = await ensureDefaultPoolAndTiers();
  await prisma.$transaction(async (tx) => {
    const bal = await getBalanceRow(tx, user.id, STAKE_ASSET);
    if (d(bal.available).lt(amt)) {
      const e = new Error(`insufficient ${STAKE_ASSET} available`);
      e.code = "INSUFFICIENT_BALANCE";
      throw e;
    }
    await tx.cexBalance.update({
      where: { id: bal.id },
      data: { available: d(bal.available).minus(amt).toString() },
    });
    const existing = await tx.cexStakePosition.findUnique({
      where: { userId_poolId: { userId: user.id, poolId: pool.id } },
    });
    const next = existing ? d(existing.stakedAmount).plus(amt) : amt;
    if (existing) {
      await tx.cexStakePosition.update({
        where: { id: existing.id },
        data: { stakedAmount: next.toString() },
      });
    } else {
      await tx.cexStakePosition.create({
        data: { userId: user.id, poolId: pool.id, stakedAmount: next.toString() },
      });
    }
    await tx.cexLedgerEntry.create({
      data: {
        userId: user.id,
        kind: "stake_in",
        asset: STAKE_ASSET,
        deltaAvail: amt.negated().toString(),
      },
    });
  });
  return positions({ user });
}

async function unstake({ body, user }) {
  if (!user?.id) {
    return { ok: false, error: "not authenticated", code: "UNAUTHENTICATED" };
  }
  const rawAmt = body?.amount;
  const amt = d(rawAmt);
  if (!rawAmt || amt.lte(0)) {
    return { ok: false, error: "amount must be positive", code: "BAD_AMOUNT" };
  }
  const pool = await ensureDefaultPoolAndTiers();
  await prisma.$transaction(async (tx) => {
    const pos = await tx.cexStakePosition.findUnique({
      where: { userId_poolId: { userId: user.id, poolId: pool.id } },
    });
    if (!pos || d(pos.stakedAmount).lt(amt)) {
      const e = new Error("insufficient staked amount");
      e.code = "INSUFFICIENT_STAKE";
      throw e;
    }
    const remaining = d(pos.stakedAmount).minus(amt);
    if (remaining.lte(0)) {
      await tx.cexStakePosition.delete({ where: { id: pos.id } });
    } else {
      await tx.cexStakePosition.update({
        where: { id: pos.id },
        data: { stakedAmount: remaining.toString() },
      });
    }
    const bal = await getBalanceRow(tx, user.id, STAKE_ASSET);
    await tx.cexBalance.update({
      where: { id: bal.id },
      data: { available: d(bal.available).plus(amt).toString() },
    });
    await tx.cexLedgerEntry.create({
      data: {
        userId: user.id,
        kind: "stake_out",
        asset: STAKE_ASSET,
        deltaAvail: amt.toString(),
      },
    });
  });
  return positions({ user });
}

module.exports = {
  pools,
  positions,
  stake,
  unstake,
  ensureDefaultPoolAndTiers,
  resolveUserStakeTier,
  effectiveTakerFeeBpsForUser,
  effectiveReferralBoostBpsForUser,
  userTierRank,
};

