/**
 * DEX swap orchestration — external liquidity via 0x only (`requireDexMode` routes).
 * Do not use this module for CEX / internal matcher fills; see docs/architecture.md §3.
 */
const swap0xService = require("../swap0x/swap0x.service");
const feesService = require("../fees/fees.service");
const referralLedger = require("../referral/referral.ledger");
const referralModel = require("../referral/referral.model");
const { getOrCreateUserByAddress } = require("../users/users.model");
const stakingService = require("../staking/staking.service");
const activityService = require("../activity/activity.service");
const referralEngine = require("../referral/referral.engine");

function assertRoutableQuote(q) {
  if (q && q.liquidityAvailable === false) {
    const err = new Error(
      "No on-chain liquidity route for this pair yet. Add AMM liquidity (e.g. PancakeSwap on BSC) so 0x can aggregate it."
    );
    err.statusCode = 422;
    err.details = { liquidityAvailable: false };
    throw err;
  }
}

async function quote({ body }) {
  const q = await swap0xService.quote(body || {});
  assertRoutableQuote(q);
  return { ok: true, quote: q };
}

async function execute({ body, user }) {
  const q = await swap0xService.quote(body || {});
  assertRoutableQuote(q);

  // fee tracking (Phase 1+)
  if (q?.fees?.integratorFee?.token && q?.fees?.integratorFee?.amount) {
    feesService.recordSwapIntegratorFee({
      id: q.zid || `${Date.now()}`,
      chainId: body?.chainId,
      userAddress: user?.address || null,
      feeToken: q.fees.integratorFee.token,
      feeAmount: q.fees.integratorFee.amount
    });
    // treasury credit (in-memory accounting)
    feesService.creditTreasury({
      id: q.zid || `${Date.now()}`,
      chainId: body?.chainId,
      token: q.fees.integratorFee.token,
      amount: q.fees.integratorFee.amount
    });
  }

  // tx fields
  const tx = q?.transaction
    ? {
        to: q.transaction.to,
        data: q.transaction.data,
        value: q.transaction.value,
        gas: q.transaction.gas,
        gasPrice: q.transaction.gasPrice
      }
    : null;

  // referral reward ledger (Phase 1)
  let referralReward = null;
  if (user?.address && user?.referralParent && q?.fees?.integratorFee?.amount) {
    const tiers = referralModel.emptyStats().tiers;
    const parentAddress = String(user.referralParent).toLowerCase();
    const childAddress = String(user.address).toLowerCase();
    const integratorFeeAmount = BigInt(q.fees.integratorFee.amount);
    const parentUser = await getOrCreateUserByAddress(parentAddress);
    const boostBps = await stakingService.effectiveReferralBoostBpsForUser(parentUser.id);
    const level1Bps = Math.min(10000, Math.max(0, Math.round((tiers.level1 || 0) * 10000)));
    const shareBps = Math.min(10000, level1Bps + boostBps);
    const rewardAmount = (integratorFeeAmount * BigInt(shareBps)) / 10000n;

    referralReward = await referralLedger.add({
      id: q.zid || `${Date.now()}`,
      chainId: body?.chainId,
      parentAddress,
      childAddress,
      feeToken: q.fees.integratorFee.token,
      integratorFeeAmount: q.fees.integratorFee.amount,
      rewardAmount: rewardAmount.toString(),
      amountUsd: 0,
      status: "pending",
      payoutStatus: "unpaid",
    });
  }

  // Activity engine: any successful quote/execute request indicates intent; treat as swap activity.
  if (user?.id && user?.address) {
    void activityService
      .record({ user, activityType: "swap", amount: q?.buyAmount || null })
      .then(() => referralEngine.validatePendingReferralsForWallet({ walletAddress: user.address }))
      .catch(() => {});
  }

  return { ok: true, tx, allowanceTarget: q?.allowanceTarget, quote: q, referralReward };
}

module.exports = { quote, execute };

