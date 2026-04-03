/**
 * Phase 4 — internal liquidity pools (DB-backed, constant-product v1).
 * Does not call 0x. Writes gated by CEX_LIQUIDITY_ENABLED=true.
 */
const { Prisma } = require("@prisma/client");
const Decimal = require("decimal.js");
const { prisma } = require("../../lib/prisma");
const { getBalanceRow, d } = require("./cex.balances");
const { CEX_MATCHER_SYMBOL, CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("./cex.config");
const { takerFeeOnBuyBase, takerFeeOnSellQuote } = require("./cex.fees");
const stakingService = require("../staking/staking.service");
const liqMining = require("../incentives/liqMining.service");

/** Reserved address for synthetic pool maker orders (never used for real login). */
const POOL_SYSTEM_ADDRESS = "0x0000000000000000000000000000000000000ce1";

function poolMatchingEnabled() {
  return String(process.env.CEX_POOL_MATCHING_ENABLED || "").toLowerCase() === "true";
}

async function assertNonNegativeBal(str) {
  if (d(str).lt(0)) throw new Error("balance would go negative");
}

async function creditTreasuryFee(tx, treasuryUserId, asset, feeAmt) {
  if (!treasuryUserId || feeAmt.lte(0)) return;
  const row = await getBalanceRow(tx, treasuryUserId, asset);
  await tx.cexBalance.update({
    where: { id: row.id },
    data: { available: d(row.available).plus(feeAmt).toString() },
  });
}

function feeBpsFromEnv() {
  const raw = parseInt(process.env.CEX_LIQUIDITY_POOL_FEE_BPS || process.env.CEX_FEE_BPS || "0", 10);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(raw, 5000);
}

function assertLiquidityWrites() {
  if (String(process.env.CEX_LIQUIDITY_ENABLED || "").toLowerCase() !== "true") {
    const e = new Error("CEX liquidity writes are disabled (set CEX_LIQUIDITY_ENABLED=true)");
    e.code = "LIQUIDITY_DISABLED";
    throw e;
  }
}

/**
 * Ensure one row exists for the configured matcher pair (zero reserves until funded).
 */
async function ensurePrimaryPool() {
  const feeBps = feeBpsFromEnv();
  const existing = await prisma.cexLiquidityPool.findUnique({
    where: { symbol: CEX_MATCHER_SYMBOL },
  });
  if (existing) {
    if (existing.feeBps !== feeBps) {
      return prisma.cexLiquidityPool.update({
        where: { id: existing.id },
        data: { feeBps },
      });
    }
    return existing;
  }
  return prisma.cexLiquidityPool.create({
    data: {
      symbol: CEX_MATCHER_SYMBOL,
      baseAsset: CEX_BASE_ASSET,
      quoteAsset: CEX_QUOTE_ASSET,
      reserveBase: "0",
      reserveQuote: "0",
      totalLpSupply: "0",
      feeBps,
      status: "active",
    },
  });
}

function serializePool(p) {
  return {
    id: p.id,
    symbol: p.symbol,
    baseAsset: p.baseAsset,
    quoteAsset: p.quoteAsset,
    reserveBase: p.reserveBase,
    reserveQuote: p.reserveQuote,
    totalLpSupply: p.totalLpSupply,
    feeBps: p.feeBps,
    status: p.status,
    rewardAsset: p.rewardAsset ?? null,
    rewardRatePerSecond: p.rewardRatePerSecond ?? null,
    rewardAccPerLp: p.rewardAccPerLp ?? "0",
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function listPools() {
  await ensurePrimaryPool();
  const pools = await prisma.cexLiquidityPool.findMany({
    where: { status: "active" },
    orderBy: { symbol: "asc" },
  });
  const mults = await liqMining.currentMultiplierBpsBySymbols(pools.map((p) => p.symbol));
  return {
    ok: true,
    pools: pools.map((p) => {
      const base = serializePool(p);
      const mb = mults[p.symbol] ?? liqMining.BASE_BPS;
      const eff =
        p.rewardRatePerSecond && mb !== liqMining.BASE_BPS
          ? d(p.rewardRatePerSecond).times(mb).div(liqMining.BASE_BPS).toString()
          : null;
      return {
        ...base,
        liqMiningMultiplierBps: mb,
        liqMiningEffectiveRewardRatePerSecond: eff,
      };
    }),
  };
}

async function getPool(poolId) {
  await ensurePrimaryPool();
  const p = await prisma.cexLiquidityPool.findFirst({
    where: { id: poolId, status: "active" },
  });
  if (!p) {
    const e = new Error("pool not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  const mults = await liqMining.currentMultiplierBpsBySymbols([p.symbol]);
  const mb = mults[p.symbol] ?? liqMining.BASE_BPS;
  const base = serializePool(p);
  const eff =
    p.rewardRatePerSecond && mb !== liqMining.BASE_BPS
      ? d(p.rewardRatePerSecond).times(mb).div(liqMining.BASE_BPS).toString()
      : null;
  return {
    ok: true,
    pool: {
      ...base,
      liqMiningMultiplierBps: mb,
      liqMiningEffectiveRewardRatePerSecond: eff,
    },
  };
}

async function listUserPositions(userId) {
  await ensurePrimaryPool();
  await prisma.$transaction(
    async (tx) => {
      const ids = await tx.cexLiquidityPosition.findMany({
        where: { userId },
        select: { poolId: true },
      });
      const poolIds = [...new Set(ids.map((r) => r.poolId))];
      for (const pid of poolIds) {
        await syncUserPositionRewards(tx, userId, pid);
      }
    },
    { timeout: 15_000 }
  );
  const rows = await prisma.cexLiquidityPosition.findMany({
    where: { userId },
    include: { pool: true },
    orderBy: { updatedAt: "desc" },
  });
  const positions = rows
    .filter((r) => r.pool.status === "active")
    .map((r) => ({
      id: r.id,
      poolId: r.poolId,
      symbol: r.pool.symbol,
      baseAsset: r.pool.baseAsset,
      quoteAsset: r.pool.quoteAsset,
      lpShares: r.lpShares,
      poolReserveBase: r.pool.reserveBase,
      poolReserveQuote: r.pool.reserveQuote,
      poolTotalLpSupply: r.pool.totalLpSupply,
      rewardAsset: r.pool.rewardAsset || null,
      rewardRatePerSecond: r.pool.rewardRatePerSecond || null,
      rewardAccPerLp: r.pool.rewardAccPerLp,
      rewardDebt: r.rewardDebt,
      unclaimedReward: r.unclaimedReward,
      updatedAt: r.updatedAt.toISOString(),
    }));
  return { ok: true, positions };
}

function rewardConfigFromEnv() {
  const asset = String(process.env.CEX_LIQ_REWARD_ASSET || "").trim().toUpperCase();
  const rateStr = String(process.env.CEX_LIQ_REWARD_RATE_PER_SECOND || "").trim();
  if (!asset || !rateStr) return null;
  const rate = d(rateStr);
  if (rate.lte(0)) return null;
  return { rewardAsset: asset, rewardRatePerSecond: rate.toString() };
}

/**
 * Accrue pool-wide rewards up to now, updating rewardAccPerLp and rewardLastAccruedAt.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} poolId
 */
async function accruePoolRewardsNow(tx, poolId) {
  const pool = await tx.cexLiquidityPool.findUnique({ where: { id: poolId } });
  if (!pool) return;
  const cfg = rewardConfigFromEnv();
  if (!cfg || !cfg.rewardRatePerSecond) {
    if (!pool.rewardLastAccruedAt) {
      await tx.cexLiquidityPool.update({
        where: { id: pool.id },
        data: { rewardAsset: null, rewardRatePerSecond: null, rewardLastAccruedAt: new Date() },
      });
    }
    return;
  }
  const S = d(pool.totalLpSupply);
  if (S.lte(0)) {
    await tx.cexLiquidityPool.update({
      where: { id: pool.id },
      data: {
        rewardAsset: cfg.rewardAsset,
        rewardRatePerSecond: cfg.rewardRatePerSecond,
        rewardLastAccruedAt: new Date(),
      },
    });
    return;
  }
  const last = pool.rewardLastAccruedAt || pool.createdAt;
  const now = new Date();
  const elapsedSec = Math.max(0, Math.floor((now.getTime() - last.getTime()) / 1000));
  if (elapsedSec <= 0) return;
  const rate = d(cfg.rewardRatePerSecond);
  const campaigns = await liqMining.loadCampaignsOverlappingTx(tx, pool.symbol, last, now);
  const deltaAcc = liqMining.accrualDeltaAccPerLp({
    rate,
    S,
    poolSymbol: pool.symbol,
    last,
    now,
    campaigns,
  });
  const nextAcc = d(pool.rewardAccPerLp).plus(deltaAcc).toString();
  await tx.cexLiquidityPool.update({
    where: { id: pool.id },
    data: {
      rewardAsset: cfg.rewardAsset,
      rewardRatePerSecond: cfg.rewardRatePerSecond,
      rewardAccPerLp: nextAcc,
      rewardLastAccruedAt: now,
    },
  });
}

/**
 * Sync a user's LP position rewards for a pool (accrue pool-wide first, then update position).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function syncUserPositionRewards(tx, userId, poolId) {
  await accruePoolRewardsNow(tx, poolId);
  const pool = await tx.cexLiquidityPool.findUnique({ where: { id: poolId } });
  if (!pool) return;
  const pos = await tx.cexLiquidityPosition.findUnique({
    where: { userId_poolId: { userId, poolId } },
  });
  if (!pos) return;
  const lp = d(pos.lpShares);
  if (lp.lte(0)) {
    await tx.cexLiquidityPosition.update({
      where: { id: pos.id },
      data: { rewardDebt: pool.rewardAccPerLp, unclaimedReward: pos.unclaimedReward },
    });
    return;
  }
  const acc = d(pool.rewardAccPerLp);
  const debt = d(pos.rewardDebt);
  const pending = lp.times(acc.minus(debt)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (pending.lte(0)) {
    await tx.cexLiquidityPosition.update({
      where: { id: pos.id },
      data: { rewardDebt: acc.toString() },
    });
    return;
  }
  const nextUnclaimed = d(pos.unclaimedReward).plus(pending).toString();
  await tx.cexLiquidityPosition.update({
    where: { id: pos.id },
    data: { rewardDebt: acc.toString(), unclaimedReward: nextUnclaimed },
  });
}

/**
 * Claim accumulated LP rewards into the user's CEX balance.
 * @param {string} userId
 * @param {string} poolId
 */
async function claimRewards(userId, poolId) {
  const pid = String(poolId || "").trim();
  if (!pid) {
    return { ok: false, error: "poolId is required", code: "BAD_REQUEST" };
  }
  return prisma.$transaction(async (tx) => {
    await accruePoolRewardsNow(tx, pid);
    const pool = await tx.cexLiquidityPool.findUnique({ where: { id: pid } });
    if (!pool || !pool.rewardAsset || !pool.rewardRatePerSecond) {
      return { ok: false, error: "rewards not configured for this pool", code: "NO_REWARD_CONFIG" };
    }
    const pos = await tx.cexLiquidityPosition.findUnique({
      where: { userId_poolId: { userId, poolId: pid } },
    });
    if (!pos) {
      return { ok: false, error: "no position for this pool", code: "NO_POSITION" };
    }
    const beforeUnclaimed = d(pos.unclaimedReward);
    await syncUserPositionRewards(tx, userId, pid);
    const freshPos = await tx.cexLiquidityPosition.findUnique({
      where: { userId_poolId: { userId, poolId: pid } },
    });
    if (!freshPos) {
      return { ok: false, error: "position missing after sync", code: "NO_POSITION" };
    }
    const amt = d(freshPos.unclaimedReward);
    if (amt.lte(0)) {
      return { ok: false, error: "nothing to claim", code: "NOTHING_TO_CLAIM" };
    }
    const bal = await getBalanceRow(tx, userId, pool.rewardAsset);
    await tx.cexBalance.update({
      where: { id: bal.id },
      data: { available: d(bal.available).plus(amt).toString() },
    });
    await tx.cexLedgerEntry.create({
      data: {
        userId,
        kind: "liquidity_reward",
        asset: pool.rewardAsset,
        deltaAvail: amt.toString(),
      },
    });
    await tx.cexLiquidityPosition.update({
      where: { id: freshPos.id },
      data: { unclaimedReward: "0" },
    });
    return {
      ok: true,
      claimed: amt.toString(),
      asset: pool.rewardAsset,
      beforeUnclaimed: beforeUnclaimed.toString(),
    };
  });
}

/**
 * @param {string} userId
 * @param {string} poolId
 * @param {string} baseAmount
 * @param {string} quoteAmount
 */
async function addLiquidity(userId, poolId, baseAmount, quoteAmount) {
  assertLiquidityWrites();
  const pid = String(poolId || "").trim();
  if (!pid) {
    const e = new Error("poolId is required");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const baseInRaw = d(baseAmount);
  const quoteInRaw = d(quoteAmount);
  if (baseInRaw.lte(0) || quoteInRaw.lte(0)) {
    const e = new Error("baseAmount and quoteAmount must be positive");
    e.code = "BAD_AMOUNT";
    throw e;
  }

  return prisma.$transaction(
    async (tx) => {
      const pool = await tx.cexLiquidityPool.findFirst({
        where: { id: pid, status: "active" },
      });
      if (!pool) {
        const e = new Error("pool not found");
        e.code = "NOT_FOUND";
        throw e;
      }
      if (pool.baseAsset !== CEX_BASE_ASSET || pool.quoteAsset !== CEX_QUOTE_ASSET) {
        const e = new Error("pool assets do not match CEX pair");
        e.code = "BAD_POOL";
        throw e;
      }

      await accruePoolRewardsNow(tx, pool.id);
      const fresh = await tx.cexLiquidityPool.findUnique({ where: { id: pool.id } });
      const rb = d(fresh.reserveBase);
      const rq = d(fresh.reserveQuote);
      const S = d(fresh.totalLpSupply);

      let liquidity;
      /** @type {import("decimal.js").default} */
      let baseUsed;
      /** @type {import("decimal.js").default} */
      let quoteUsed;

      if (S.lte(0)) {
        if (rb.gt(0) || rq.gt(0)) {
          const e = new Error("pool state inconsistent (zero LP but non-zero reserves)");
          e.code = "POOL_INCONSISTENT";
          throw e;
        }
        liquidity = baseInRaw.mul(quoteInRaw).sqrt();
        liquidity = liquidity.toDecimalPlaces(40, Decimal.ROUND_DOWN);
        if (liquidity.lte(0)) {
          const e = new Error("initial liquidity too small");
          e.code = "ZERO_LIQUIDITY_MINT";
          throw e;
        }
        baseUsed = baseInRaw;
        quoteUsed = quoteInRaw;
      } else {
        if (rb.lte(0) || rq.lte(0)) {
          const e = new Error("pool has LP shares but zero reserves");
          e.code = "POOL_INCONSISTENT";
          throw e;
        }
        const liqFromBase = baseInRaw.mul(S).div(rb);
        const liqFromQuote = quoteInRaw.mul(S).div(rq);
        liquidity = liqFromBase.lessThanOrEqualTo(liqFromQuote) ? liqFromBase : liqFromQuote;
        liquidity = liquidity.toDecimalPlaces(40, Decimal.ROUND_DOWN);
        if (liquidity.lte(0)) {
          const e = new Error("amounts too small or wrong ratio for existing reserves");
          e.code = "ZERO_LIQUIDITY_MINT";
          throw e;
        }
        baseUsed = liquidity.mul(rb).div(S).toDecimalPlaces(40, Decimal.ROUND_DOWN);
        quoteUsed = liquidity.mul(rq).div(S).toDecimalPlaces(40, Decimal.ROUND_DOWN);
      }

      const baseRow = await getBalanceRow(tx, userId, pool.baseAsset);
      const quoteRow = await getBalanceRow(tx, userId, pool.quoteAsset);
      if (d(baseRow.available).lt(baseUsed)) {
        const e = new Error(`insufficient ${pool.baseAsset} available`);
        e.code = "INSUFFICIENT_BASE";
        throw e;
      }
      if (d(quoteRow.available).lt(quoteUsed)) {
        const e = new Error(`insufficient ${pool.quoteAsset} available`);
        e.code = "INSUFFICIENT_QUOTE";
        throw e;
      }

      await tx.cexBalance.update({
        where: { id: baseRow.id },
        data: { available: d(baseRow.available).minus(baseUsed).toString() },
      });
      await tx.cexBalance.update({
        where: { id: quoteRow.id },
        data: { available: d(quoteRow.available).minus(quoteUsed).toString() },
      });

      await tx.cexLedgerEntry.createMany({
        data: [
          {
            userId,
            kind: "liquidity_add_base",
            asset: pool.baseAsset,
            deltaAvail: baseUsed.negated().toString(),
          },
          {
            userId,
            kind: "liquidity_add_quote",
            asset: pool.quoteAsset,
            deltaAvail: quoteUsed.negated().toString(),
          },
        ],
      });

      const newRb = rb.plus(baseUsed).toString();
      const newRq = rq.plus(quoteUsed).toString();
      const newS = S.plus(liquidity).toString();

      await tx.cexLiquidityPool.update({
        where: { id: pool.id },
        data: {
          reserveBase: newRb,
          reserveQuote: newRq,
          totalLpSupply: newS,
        },
      });

      const existingPos = await tx.cexLiquidityPosition.findUnique({
        where: { userId_poolId: { userId, poolId: pool.id } },
      });
      const nextShares = existingPos ? d(existingPos.lpShares).plus(liquidity).toString() : liquidity.toString();
      if (existingPos) {
        await syncUserPositionRewards(tx, userId, pool.id);
        await tx.cexLiquidityPosition.update({
          where: { id: existingPos.id },
          data: { lpShares: nextShares },
        });
      } else {
        await tx.cexLiquidityPosition.create({
          data: { userId, poolId: pool.id, lpShares: nextShares, rewardDebt: fresh.rewardAccPerLp },
        });
      }

      const updatedPool = await tx.cexLiquidityPool.findUnique({ where: { id: pool.id } });
      return {
        ok: true,
        pool: serializePool(updatedPool),
        lpMinted: liquidity.toString(),
        baseDebited: baseUsed.toString(),
        quoteDebited: quoteUsed.toString(),
        positionLpShares: nextShares,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    }
  );
}

/**
 * @param {string} userId
 * @param {string} poolId
 * @param {string} lpSharesToBurn
 */
async function removeLiquidity(userId, poolId, lpSharesToBurn) {
  assertLiquidityWrites();
  const pid = String(poolId || "").trim();
  if (!pid) {
    const e = new Error("poolId is required");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const burn = d(lpSharesToBurn);
  if (burn.lte(0)) {
    const e = new Error("lpShares must be positive");
    e.code = "BAD_AMOUNT";
    throw e;
  }

  return prisma.$transaction(
    async (tx) => {
      const pool = await tx.cexLiquidityPool.findFirst({
        where: { id: pid, status: "active" },
      });
      if (!pool) {
        const e = new Error("pool not found");
        e.code = "NOT_FOUND";
        throw e;
      }

      const pos = await tx.cexLiquidityPosition.findUnique({
        where: { userId_poolId: { userId, poolId: pool.id } },
      });
      if (!pos || d(pos.lpShares).lt(burn)) {
        const e = new Error("insufficient LP shares");
        e.code = "INSUFFICIENT_LP";
        throw e;
      }

      await syncUserPositionRewards(tx, userId, pool.id);
      await accruePoolRewardsNow(tx, pool.id);
      const fresh = await tx.cexLiquidityPool.findUnique({ where: { id: pool.id } });
      const rb = d(fresh.reserveBase);
      const rq = d(fresh.reserveQuote);
      const S = d(fresh.totalLpSupply);
      if (S.lte(0) || burn.gt(S)) {
        const e = new Error("cannot burn more LP than pool supply");
        e.code = "POOL_INCONSISTENT";
        throw e;
      }

      const baseOut = burn.mul(rb).div(S).toDecimalPlaces(40, Decimal.ROUND_DOWN);
      const quoteOut = burn.mul(rq).div(S).toDecimalPlaces(40, Decimal.ROUND_DOWN);

      const newS = S.minus(burn);
      const newRb = rb.minus(baseOut);
      const newRq = rq.minus(quoteOut);
      if (newRb.lt(0) || newRq.lt(0) || newS.lt(0)) {
        const e = new Error("removal would make pool negative");
        e.code = "POOL_INCONSISTENT";
        throw e;
      }

      const baseRow = await getBalanceRow(tx, userId, pool.baseAsset);
      const quoteRow = await getBalanceRow(tx, userId, pool.quoteAsset);

      await tx.cexBalance.update({
        where: { id: baseRow.id },
        data: { available: d(baseRow.available).plus(baseOut).toString() },
      });
      await tx.cexBalance.update({
        where: { id: quoteRow.id },
        data: { available: d(quoteRow.available).plus(quoteOut).toString() },
      });

      await tx.cexLedgerEntry.createMany({
        data: [
          {
            userId,
            kind: "liquidity_remove_base",
            asset: pool.baseAsset,
            deltaAvail: baseOut.toString(),
          },
          {
            userId,
            kind: "liquidity_remove_quote",
            asset: pool.quoteAsset,
            deltaAvail: quoteOut.toString(),
          },
        ],
      });

      await tx.cexLiquidityPool.update({
        where: { id: pool.id },
        data: {
          reserveBase: newRb.toString(),
          reserveQuote: newRq.toString(),
          totalLpSupply: newS.toString(),
        },
      });

      const remaining = d(pos.lpShares).minus(burn);
      if (remaining.lte(0)) {
        await tx.cexLiquidityPosition.delete({ where: { id: pos.id } });
      } else {
        await tx.cexLiquidityPosition.update({
          where: { id: pos.id },
          data: { lpShares: remaining.toString() },
        });
      }

      const updatedPool = await tx.cexLiquidityPool.findUnique({ where: { id: pool.id } });
      return {
        ok: true,
        pool: serializePool(updatedPool),
        lpBurned: burn.toString(),
        baseCredited: baseOut.toString(),
        quoteCredited: quoteOut.toString(),
        positionLpSharesRemaining: remaining.lte(0) ? "0" : remaining.toString(),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    }
  );
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function ensurePoolTradeProxiesInTx(tx) {
  let pool = await tx.cexLiquidityPool.findUnique({
    where: { symbol: CEX_MATCHER_SYMBOL },
  });
  if (!pool) {
    pool = await tx.cexLiquidityPool.create({
      data: {
        symbol: CEX_MATCHER_SYMBOL,
        baseAsset: CEX_BASE_ASSET,
        quoteAsset: CEX_QUOTE_ASSET,
        reserveBase: "0",
        reserveQuote: "0",
        totalLpSupply: "0",
        feeBps: feeBpsFromEnv(),
        status: "active",
      },
    });
  }
  if (pool.proxyMakerBuyOrderId && pool.proxyMakerSellOrderId) return pool;

  const u = await tx.user.upsert({
    where: { address: POOL_SYSTEM_ADDRESS },
    create: { address: POOL_SYSTEM_ADDRESS, preferences: {} },
    update: {},
  });

  const buy = await tx.cexOrder.create({
    data: {
      userId: u.id,
      symbol: CEX_MATCHER_SYMBOL,
      side: "buy",
      orderType: "internal_pool",
      price: "1",
      quantity: "1000000000000000000000000000000",
      filled: "0",
      status: "open",
    },
  });
  const sell = await tx.cexOrder.create({
    data: {
      userId: u.id,
      symbol: CEX_MATCHER_SYMBOL,
      side: "sell",
      orderType: "internal_pool",
      price: "1",
      quantity: "1000000000000000000000000000000",
      filled: "0",
      status: "open",
    },
  });

  return tx.cexLiquidityPool.update({
    where: { id: pool.id },
    data: {
      proxyMakerBuyOrderId: buy.id,
      proxyMakerSellOrderId: sell.id,
    },
  });
}

function quoteOutAvgForSell(rb, rq, feeBps, br) {
  const f = d(feeBps).div(10000);
  const inEff = br.times(d(1).minus(f)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (inEff.lte(0)) return null;
  let quoteOut = rq.times(inEff).div(rb.plus(inEff)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (quoteOut.lte(0)) return null;
  if (quoteOut.gt(rq)) quoteOut = rq;
  return { quoteOut, priceAvg: quoteOut.div(br) };
}

function maxBaseSellThroughPoolAtLimit(rb, rq, feeBps, baseRemainder, limitPrice) {
  const P = d(limitPrice);
  const brMax = d(baseRemainder);
  if (brMax.lte(0) || P.lte(0) || rb.lte(0) || rq.lte(0)) return d(0);
  const atFull = quoteOutAvgForSell(rb, rq, feeBps, brMax);
  if (atFull && atFull.priceAvg.gte(P)) return brMax;
  let lo = d(0);
  let hi = brMax;
  for (let i = 0; i < 80; i++) {
    const mid = lo.plus(hi).div(2).toDecimalPlaces(40, Decimal.ROUND_DOWN);
    if (mid.lte(0)) break;
    if (mid.lte(lo) || mid.gte(hi)) break;
    const s = quoteOutAvgForSell(rb, rq, feeBps, mid);
    if (s && s.priceAvg.gte(P)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function baseOutAvgForBuy(rb, rq, feeBps, qrGross) {
  const f = d(feeBps).div(10000);
  const qEff = qrGross.times(d(1).minus(f)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (qEff.lte(0)) return null;
  let baseOut = rb.times(qEff).div(rq.plus(qEff)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (baseOut.lte(0)) return null;
  if (baseOut.gt(rb)) baseOut = rb;
  return { baseOut, priceAvg: qrGross.div(baseOut) };
}

function buyThroughPoolOk(rb, rq, feeBps, qrGross, baseCap, limitPrice) {
  const P = d(limitPrice);
  if (qrGross.lte(0)) return true;
  const s = baseOutAvgForBuy(rb, rq, feeBps, qrGross);
  if (!s) return false;
  return s.baseOut.lte(baseCap) && s.priceAvg.lte(P);
}

function maxQuoteBuyThroughPoolAtLimit(rb, rq, feeBps, baseRemainder, quoteCap, limitPrice) {
  const qc = d(quoteCap);
  const bc = d(baseRemainder);
  const P = d(limitPrice);
  if (qc.lte(0) || bc.lte(0) || P.lte(0) || rb.lte(0) || rq.lte(0)) return d(0);
  if (buyThroughPoolOk(rb, rq, feeBps, qc, bc, limitPrice)) return qc;
  let lo = d(0);
  let hi = qc;
  for (let i = 0; i < 80; i++) {
    const mid = lo.plus(hi).div(2).toDecimalPlaces(40, Decimal.ROUND_DOWN);
    if (mid.lte(lo) || mid.gte(hi)) break;
    if (buyThroughPoolOk(rb, rq, feeBps, mid, bc, limitPrice)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Limit sell remainder: pool leg only if VWAP from pool is ≥ limit price.
 * @param {{ userId: string, baseRemainder: string, limitPrice: string, takerOrderId: string, treasuryUserId: string | null }} p
 */
async function extendLimitSellWithPoolInTx(tx, p) {
  if (!poolMatchingEnabled()) return { baseFilled: d(0), quoteOutGross: d(0) };

  const baseRem = d(p.baseRemainder);
  const lim = d(p.limitPrice);
  if (baseRem.lte(0) || lim.lte(0)) return { baseFilled: d(0), quoteOutGross: d(0) };

  await ensurePoolTradeProxiesInTx(tx);
  const poolRow = await tx.cexLiquidityPool.findUnique({
    where: { symbol: CEX_MATCHER_SYMBOL },
  });
  if (!poolRow || d(poolRow.totalLpSupply).lte(0)) return { baseFilled: d(0), quoteOutGross: d(0) };

  const rb = d(poolRow.reserveBase);
  const rq = d(poolRow.reserveQuote);
  if (rb.lte(0) || rq.lte(0)) return { baseFilled: d(0), quoteOutGross: d(0) };

  const feeBps = poolRow.feeBps ?? 0;
  const brStar = maxBaseSellThroughPoolAtLimit(rb, rq, feeBps, baseRem, lim);
  if (brStar.lte(0)) return { baseFilled: d(0), quoteOutGross: d(0) };

  return extendMarketSellWithPoolInTx(tx, {
    userId: p.userId,
    baseRemainder: brStar.toString(),
    takerOrderId: p.takerOrderId,
    treasuryUserId: p.treasuryUserId,
  });
}

/**
 * Limit buy remainder: pool leg only if VWAP ≤ limit price; quote capped by locked quote and P×remainder.
 * @param {{ userId: string, baseRemainder: string, limitPrice: string, takerOrderId: string, treasuryUserId: string | null }} p
 */
async function extendLimitBuyWithPoolInTx(tx, p) {
  if (!poolMatchingEnabled()) return { baseFilled: d(0), quoteSpent: d(0) };

  const baseRem = d(p.baseRemainder);
  const lim = d(p.limitPrice);
  if (baseRem.lte(0) || lim.lte(0)) return { baseFilled: d(0), quoteSpent: d(0) };

  await ensurePoolTradeProxiesInTx(tx);
  const poolRow = await tx.cexLiquidityPool.findUnique({
    where: { symbol: CEX_MATCHER_SYMBOL },
  });
  if (!poolRow || d(poolRow.totalLpSupply).lte(0)) return { baseFilled: d(0), quoteSpent: d(0) };

  const rb = d(poolRow.reserveBase);
  const rq = d(poolRow.reserveQuote);
  if (rb.lte(0) || rq.lte(0)) return { baseFilled: d(0), quoteSpent: d(0) };

  const buyerQuote = await getBalanceRow(tx, p.userId, CEX_QUOTE_ASSET);
  const locked = d(buyerQuote.locked);
  const quoteCap = Decimal.min(locked, lim.times(baseRem)).toDecimalPlaces(40, Decimal.ROUND_DOWN);

  const feeBps = poolRow.feeBps ?? 0;
  const qrStar = maxQuoteBuyThroughPoolAtLimit(rb, rq, feeBps, baseRem, quoteCap, lim);
  if (qrStar.lte(0)) return { baseFilled: d(0), quoteSpent: d(0) };

  return extendMarketBuyWithPoolInTx(tx, {
    userId: p.userId,
    quoteRemainder: qrStar.toString(),
    takerOrderId: p.takerOrderId,
    treasuryUserId: p.treasuryUserId,
  });
}

/**
 * Taker sells base into the pool (IOC remainder after the order book).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ userId: string, baseRemainder: import('decimal.js').default | string, takerOrderId: string, treasuryUserId: string | null }} p
 * @returns {Promise<{ baseFilled: import('decimal.js').default, quoteOutGross: import('decimal.js').default }>}
 */
async function extendMarketSellWithPoolInTx(tx, p) {
  const zero = d(0);
  if (!poolMatchingEnabled()) return { baseFilled: zero, quoteOutGross: zero };

  const br = d(p.baseRemainder);
  if (br.lte(0)) return { baseFilled: zero, quoteOutGross: zero };

  const takerFeeBps = await stakingService.effectiveTakerFeeBpsForUser(p.userId);

  await ensurePoolTradeProxiesInTx(tx);
  const poolFresh = await tx.cexLiquidityPool.findUnique({
    where: { symbol: CEX_MATCHER_SYMBOL },
  });
  if (!poolFresh || d(poolFresh.totalLpSupply).lte(0)) return { baseFilled: zero, quoteOutGross: zero };

  const rb = d(poolFresh.reserveBase);
  const rq = d(poolFresh.reserveQuote);
  if (rb.lte(0) || rq.lte(0)) return { baseFilled: zero, quoteOutGross: zero };

  const feeBps = poolFresh.feeBps ?? 0;
  const f = d(feeBps).div(10000);
  const inEff = br.times(d(1).minus(f)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (inEff.lte(0)) return { baseFilled: zero, quoteOutGross: zero };

  let quoteOut = rq.times(inEff).div(rb.plus(inEff)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (quoteOut.lte(0)) return { baseFilled: zero, quoteOutGross: zero };
  if (quoteOut.gt(rq)) quoteOut = rq;

  const newRb = rb.plus(br).toString();
  const newRq = rq.minus(quoteOut).toString();

  await tx.cexLiquidityPool.update({
    where: { id: poolFresh.id },
    data: { reserveBase: newRb, reserveQuote: newRq },
  });

  const priceStr = quoteOut.div(br).toString();
  await applyPoolTakerSellBalances(tx, {
    takerUserId: p.userId,
    baseQty: br.toString(),
    quoteOutGross: quoteOut.toString(),
    priceStr,
    treasuryUserId: p.treasuryUserId,
    takerFeeBps,
  });

  const buyProxy = poolFresh.proxyMakerBuyOrderId;
  if (!buyProxy) throw new Error("pool proxy buy order not initialized");
  const buyOrd = await tx.cexOrder.findUnique({ where: { id: buyProxy } });
  if (!buyOrd) throw new Error("pool proxy buy order missing");

  await tx.cexTrade.create({
    data: {
      symbol: CEX_MATCHER_SYMBOL,
      price: priceStr,
      quantity: br.toString(),
      makerOrderId: buyProxy,
      takerOrderId: p.takerOrderId,
      makerUserId: buyOrd.userId,
      takerUserId: p.userId,
    },
  });

  return { baseFilled: br, quoteOutGross: quoteOut };
}

/**
 * Taker buys base from the pool using remaining quote budget (IOC after the book).
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{ userId: string, quoteRemainder: import('decimal.js').default | string, takerOrderId: string, treasuryUserId: string | null }} p
 * @returns {Promise<{ baseFilled: import('decimal.js').default, quoteSpent: import('decimal.js').default }>}
 */
async function extendMarketBuyWithPoolInTx(tx, p) {
  const zero = d(0);
  if (!poolMatchingEnabled()) return { baseFilled: zero, quoteSpent: zero };

  const qr = d(p.quoteRemainder);
  if (qr.lte(0)) return { baseFilled: zero, quoteSpent: zero };

  const takerFeeBps = await stakingService.effectiveTakerFeeBpsForUser(p.userId);

  await ensurePoolTradeProxiesInTx(tx);
  const poolFresh = await tx.cexLiquidityPool.findUnique({
    where: { symbol: CEX_MATCHER_SYMBOL },
  });
  if (!poolFresh || d(poolFresh.totalLpSupply).lte(0)) return { baseFilled: zero, quoteSpent: zero };

  const rb = d(poolFresh.reserveBase);
  const rq = d(poolFresh.reserveQuote);
  if (rb.lte(0) || rq.lte(0)) return { baseFilled: zero, quoteSpent: zero };

  const feeBps = poolFresh.feeBps ?? 0;
  const f = d(feeBps).div(10000);
  const qEff = qr.times(d(1).minus(f)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (qEff.lte(0)) return { baseFilled: zero, quoteSpent: zero };

  let baseOut = rb.times(qEff).div(rq.plus(qEff)).toDecimalPlaces(40, Decimal.ROUND_DOWN);
  if (baseOut.lte(0)) return { baseFilled: zero, quoteSpent: zero };
  if (baseOut.gt(rb)) baseOut = rb;

  const newRb = rb.minus(baseOut).toString();
  const newRq = rq.plus(qr).toString();

  await tx.cexLiquidityPool.update({
    where: { id: poolFresh.id },
    data: { reserveBase: newRb, reserveQuote: newRq },
  });

  const priceStr = qr.div(baseOut).toString();
  await applyPoolTakerBuyBalances(tx, {
    takerUserId: p.userId,
    quoteSpent: qr.toString(),
    baseOutGross: baseOut.toString(),
    treasuryUserId: p.treasuryUserId,
    takerFeeBps,
  });

  const sellProxy = poolFresh.proxyMakerSellOrderId;
  if (!sellProxy) throw new Error("pool proxy sell order not initialized");
  const sellOrd = await tx.cexOrder.findUnique({ where: { id: sellProxy } });
  if (!sellOrd) throw new Error("pool proxy sell order missing");

  await tx.cexTrade.create({
    data: {
      symbol: CEX_MATCHER_SYMBOL,
      price: priceStr,
      quantity: baseOut.toString(),
      makerOrderId: sellProxy,
      takerOrderId: p.takerOrderId,
      makerUserId: sellOrd.userId,
      takerUserId: p.userId,
    },
  });

  return { baseFilled: baseOut, quoteSpent: qr };
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function applyPoolTakerSellBalances(tx, { takerUserId, baseQty, quoteOutGross, priceStr, treasuryUserId, takerFeeBps }) {
  const qty = d(baseQty);
  const quoteAmt = d(quoteOutGross);
  const sellerBase = await getBalanceRow(tx, takerUserId, CEX_BASE_ASSET);
  const sellerQuote = await getBalanceRow(tx, takerUserId, CEX_QUOTE_ASSET);
  const sLocked = d(sellerBase.locked).minus(qty);
  await assertNonNegativeBal(sLocked.toString());
  const feeQuote = takerFeeOnSellQuote(priceStr, qty.toString(), takerFeeBps);
  const netToTakerQuote = quoteAmt.minus(feeQuote);
  if (netToTakerQuote.lt(0)) throw new Error("CEX fee exceeds taker quote receive");

  await tx.cexBalance.update({
    where: { id: sellerBase.id },
    data: { locked: sLocked.toString() },
  });
  await tx.cexBalance.update({
    where: { id: sellerQuote.id },
    data: { available: d(sellerQuote.available).plus(netToTakerQuote).toString() },
  });
  await creditTreasuryFee(tx, treasuryUserId, CEX_QUOTE_ASSET, feeQuote);
  if (feeQuote.gt(0)) {
    await tx.cexLedgerEntry.create({
      data: {
        userId: takerUserId,
        kind: "trade_fee",
        asset: CEX_QUOTE_ASSET,
        deltaAvail: feeQuote.negated().toString(),
      },
    });
    if (treasuryUserId) {
      await tx.cexLedgerEntry.create({
        data: {
          userId: treasuryUserId,
          kind: "trade_fee_in",
          asset: CEX_QUOTE_ASSET,
          deltaAvail: feeQuote.toString(),
        },
      });
    }
  }
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
async function applyPoolTakerBuyBalances(tx, { takerUserId, quoteSpent, baseOutGross, treasuryUserId, takerFeeBps }) {
  const qty = d(baseOutGross);
  const quoteAmt = d(quoteSpent);
  const buyerQuote = await getBalanceRow(tx, takerUserId, CEX_QUOTE_ASSET);
  const buyerBase = await getBalanceRow(tx, takerUserId, CEX_BASE_ASSET);
  const bLocked = d(buyerQuote.locked).minus(quoteAmt);
  await assertNonNegativeBal(bLocked.toString());
  const feeBase = takerFeeOnBuyBase(qty.toString(), takerFeeBps);
  const netToTakerBase = qty.minus(feeBase);
  if (netToTakerBase.lt(0)) throw new Error("CEX fee exceeds taker base receive");

  await tx.cexBalance.update({
    where: { id: buyerQuote.id },
    data: { locked: bLocked.toString() },
  });
  await tx.cexBalance.update({
    where: { id: buyerBase.id },
    data: { available: d(buyerBase.available).plus(netToTakerBase).toString() },
  });
  await creditTreasuryFee(tx, treasuryUserId, CEX_BASE_ASSET, feeBase);
  if (feeBase.gt(0)) {
    await tx.cexLedgerEntry.create({
      data: {
        userId: takerUserId,
        kind: "trade_fee",
        asset: CEX_BASE_ASSET,
        deltaAvail: feeBase.negated().toString(),
      },
    });
    if (treasuryUserId) {
      await tx.cexLedgerEntry.create({
        data: {
          userId: treasuryUserId,
          kind: "trade_fee_in",
          asset: CEX_BASE_ASSET,
          deltaAvail: feeBase.toString(),
        },
      });
    }
  }
}

module.exports = {
  ensurePrimaryPool,
  listPools,
  getPool,
  listUserPositions,
  addLiquidity,
  removeLiquidity,
  feeBpsFromEnv,
  poolMatchingEnabled,
  ensurePoolTradeProxiesInTx,
  extendMarketSellWithPoolInTx,
  extendMarketBuyWithPoolInTx,
  extendLimitSellWithPoolInTx,
  extendLimitBuyWithPoolInTx,
  accruePoolRewardsNow,
  syncUserPositionRewards,
  claimRewards,
};
