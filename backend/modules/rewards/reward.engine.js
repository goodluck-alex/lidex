const { prisma } = require("../../lib/prisma");

function toDec(x) {
  const s = typeof x === "string" ? x : String(x ?? "0");
  return s.trim() || "0";
}

function addDec(a, b) {
  return (BigInt(toDec(a)) + BigInt(toDec(b))).toString();
}

function subDec(a, b) {
  return (BigInt(toDec(a)) - BigInt(toDec(b))).toString();
}

async function ensureBalanceForUser(tx, user) {
  const wallet = String(user.address).toLowerCase();
  return tx.tokenBalance.upsert({
    where: { wallet },
    create: { wallet, userId: user.id, totalEarned: "0", locked: "0", unlocked: "0", claimed: "0" },
    update: {},
  });
}

async function createPendingReward({ userId, walletAddress, source, amountLdx, unlockAt, referralId = null }) {
  const wallet = String(walletAddress).toLowerCase();
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("user not found");
    if (String(user.address).toLowerCase() !== wallet) throw new Error("wallet mismatch");

    const reward = await tx.reward.create({
      data: {
        userId,
        source: String(source),
        ldxAmount: toDec(amountLdx),
        status: "pending",
        unlockAt: unlockAt instanceof Date ? unlockAt : null,
        referralId: referralId ? String(referralId) : null,
      },
    });

    const bal = await ensureBalanceForUser(tx, user);
    await tx.tokenBalance.update({
      where: { wallet: bal.wallet },
      data: {
        totalEarned: addDec(bal.totalEarned, reward.ldxAmount),
        locked: addDec(bal.locked, reward.ldxAmount),
      },
    });

    return reward;
  });
}

async function unlockDueRewards({ now = new Date() } = {}) {
  const ts = now instanceof Date ? now : new Date(now);
  const due = await prisma.reward.findMany({
    where: { status: "pending", unlockAt: { not: null, lte: ts } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  if (due.length === 0) return { ok: true, unlocked: 0 };

  let unlocked = 0;
  await prisma.$transaction(async (tx) => {
    for (const r of due) {
      // idempotency: only transition if still pending
      const updated = await tx.reward.updateMany({
        where: { id: r.id, status: "pending" },
        data: { status: "unlocked" },
      });
      if (updated.count !== 1) continue;

      const user = await tx.user.findUnique({ where: { id: r.userId } });
      if (!user) continue;
      const wallet = String(user.address).toLowerCase();
      const bal = await ensureBalanceForUser(tx, user);
      await tx.tokenBalance.update({
        where: { wallet: bal.wallet },
        data: {
          locked: subDec(bal.locked, r.ldxAmount),
          unlocked: addDec(bal.unlocked, r.ldxAmount),
        },
      });
      unlocked += 1;
    }
  });

  return { ok: true, unlocked };
}

module.exports = { createPendingReward, unlockDueRewards };

