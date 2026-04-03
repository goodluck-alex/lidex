const { prisma } = require("../../lib/prisma");

function mapEntry(row) {
  return {
    id: row.id,
    chainId: row.chainId,
    parentAddress: row.parentAddress,
    childAddress: row.childAddress,
    feeToken: row.feeToken,
    integratorFeeAmount: row.integratorFeeAmount,
    rewardAmount: row.rewardAmount,
    amountUsd: row.amountUsd,
    status: row.status,
    payoutStatus: row.payoutStatus,
    txHash: row.txHash,
    confirmedAt: row.confirmedAt ? row.confirmedAt.getTime() : null,
    payoutTxHash: row.payoutTxHash,
    paidAt: row.paidAt ? row.paidAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
  };
}

async function add(entry) {
  const row = await prisma.referralLedgerEntry.create({
    data: {
      id: entry.id,
      chainId: entry.chainId,
      parentAddress: entry.parentAddress,
      childAddress: entry.childAddress,
      feeToken: entry.feeToken,
      integratorFeeAmount: entry.integratorFeeAmount,
      rewardAmount: entry.rewardAmount,
      amountUsd: entry.amountUsd ?? 0,
      status: entry.status,
      payoutStatus: entry.payoutStatus ?? "unpaid",
    },
  });
  return mapEntry(row);
}

async function confirm({ id, txHash }) {
  try {
    const row = await prisma.referralLedgerEntry.update({
      where: { id },
      data: {
        txHash: String(txHash),
        status: "confirmed",
        confirmedAt: new Date(),
      },
    });
    return mapEntry(row);
  } catch (e) {
    if (e.code === "P2025") return null;
    throw e;
  }
}

async function markPaid({ id, payoutTxHash }) {
  try {
    const row = await prisma.referralLedgerEntry.update({
      where: { id },
      data: {
        payoutStatus: "paid",
        payoutTxHash: payoutTxHash ? String(payoutTxHash) : null,
        paidAt: new Date(),
      },
    });
    return mapEntry(row);
  } catch (e) {
    if (e.code === "P2025") return null;
    throw e;
  }
}

async function listByUserAddress(addressLower) {
  if (!addressLower) return [];
  const a = String(addressLower).toLowerCase();
  const rows = await prisma.referralLedgerEntry.findMany({
    where: { OR: [{ parentAddress: a }, { childAddress: a }] },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapEntry);
}

module.exports = { add, confirm, markPaid, listByUserAddress };
