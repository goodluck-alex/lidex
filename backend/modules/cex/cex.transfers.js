const { prisma } = require("../../lib/prisma");
const { getBalanceRow, d, CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("./cex.balances");

function paperTransfersEnabled() {
  return String(process.env.CEX_PAPER_TRANSFERS || "").toLowerCase() === "true";
}

function assertAllowedAsset(asset) {
  const a = String(asset || "").trim().toUpperCase();
  if (a !== CEX_BASE_ASSET && a !== CEX_QUOTE_ASSET) {
    const err = new Error(`asset must be ${CEX_BASE_ASSET} or ${CEX_QUOTE_ASSET}`);
    err.code = "BAD_ASSET";
    throw err;
  }
  return a;
}

function assertPositive(amount) {
  const x = d(amount);
  if (x.lte(0)) {
    const err = new Error("amount must be positive");
    err.code = "BAD_AMOUNT";
    throw err;
  }
  return x;
}

/**
 * Simulated on-ramp: credit available + ledger row.
 * @param {string} userId
 * @param {string} asset
 * @param {string} amount
 */
async function depositSimulated(userId, asset, amount) {
  if (!paperTransfersEnabled()) {
    const err = new Error("CEX_PAPER_TRANSFERS is not enabled");
    err.code = "FORBIDDEN";
    throw err;
  }
  const a = assertAllowedAsset(asset);
  const x = assertPositive(amount);

  return prisma.$transaction(async (tx) => {
    const row = await getBalanceRow(tx, userId, a);
    const next = d(row.available).plus(x);
    await tx.cexBalance.update({
      where: { id: row.id },
      data: { available: next.toString() },
    });
    await tx.cexLedgerEntry.create({
      data: {
        userId,
        kind: "deposit_simulated",
        asset: a,
        deltaAvail: x.toString(),
      },
    });
    return tx.cexBalance.findUnique({ where: { id: row.id } });
  });
}

/**
 * Simulated off-ramp: debit available + ledger row.
 */
async function withdrawSimulated(userId, asset, amount) {
  if (!paperTransfersEnabled()) {
    const err = new Error("CEX_PAPER_TRANSFERS is not enabled");
    err.code = "FORBIDDEN";
    throw err;
  }
  const a = assertAllowedAsset(asset);
  const x = assertPositive(amount);

  return prisma.$transaction(async (tx) => {
    const row = await getBalanceRow(tx, userId, a);
    const av = d(row.available);
    if (av.lt(x)) {
      const err = new Error(`insufficient ${a} available`);
      err.code = "INSUFFICIENT_FUNDS";
      throw err;
    }
    const next = av.minus(x);
    await tx.cexBalance.update({
      where: { id: row.id },
      data: { available: next.toString() },
    });
    await tx.cexLedgerEntry.create({
      data: {
        userId,
        kind: "withdraw_simulated",
        asset: a,
        deltaAvail: x.negated().toString(),
      },
    });
    return tx.cexBalance.findUnique({ where: { id: row.id } });
  });
}

async function listLedger(userId, limit = 50) {
  const take = Math.min(200, Math.max(1, Number(limit) || 50));
  const entries = await prisma.cexLedgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return { ok: true, entries };
}

module.exports = {
  depositSimulated,
  withdrawSimulated,
  listLedger,
  paperTransfersEnabled,
};
