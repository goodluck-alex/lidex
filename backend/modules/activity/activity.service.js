const { prisma } = require("../../lib/prisma");

function normalizeAddress(a) {
  return String(a || "").toLowerCase();
}

async function record({ user, activityType, amount = null }) {
  if (!user?.id || !user?.address) throw new Error("not authenticated");
  const wallet = normalizeAddress(user.address);
  const kind = String(activityType || "other");
  return prisma.walletActivity.create({
    data: {
      userId: user.id,
      wallet,
      activityType: kind,
      amount: amount == null ? null : String(amount),
    },
  });
}

async function countRecent({ walletAddress, activityType, since }) {
  const wallet = normalizeAddress(walletAddress);
  const where = {
    wallet,
    createdAt: since ? { gte: since instanceof Date ? since : new Date(since) } : undefined,
    activityType: activityType ? String(activityType) : undefined,
  };
  return prisma.walletActivity.count({ where });
}

module.exports = { record, countRecent };

