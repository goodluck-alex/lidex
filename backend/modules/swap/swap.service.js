const swap0xService = require("../swap0x/swap0x.service");
const feesService = require("../fees/fees.service");
const referralLedger = require("../referral/referral.ledger");
const referralModel = require("../referral/referral.model");

async function quote({ body }) {
  const q = await swap0xService.quote(body || {});
  return { ok: true, quote: q };
}

async function execute({ body, user }) {
  const q = await swap0xService.quote(body || {});

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
    const rewardAmount = (integratorFeeAmount * BigInt(Math.round((tiers.level1 || 0) * 10000))) / 10000n;

    referralReward = referralLedger.add({
      id: q.zid || `${Date.now()}`,
      chainId: body?.chainId,
      parentAddress,
      childAddress,
      feeToken: q.fees.integratorFee.token,
      integratorFeeAmount: q.fees.integratorFee.amount,
      rewardAmount: rewardAmount.toString(),
      amountUsd: 0,
      createdAt: Date.now(),
      status: "pending",
      payoutStatus: "unpaid"
    });
  }

  return { ok: true, tx, allowanceTarget: q?.allowanceTarget, quote: q, referralReward };
}

module.exports = { quote, execute };

