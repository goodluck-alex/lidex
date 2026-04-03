const { prisma } = require("../../lib/prisma");
const { levelFromDirectCount } = require("./referral.levels");

async function recordAttachment(parentLower, childLower) {
  const p = String(parentLower || "").toLowerCase();
  const c = String(childLower || "").toLowerCase();
  if (!p.startsWith("0x") || !c.startsWith("0x")) return false;
  try {
    await prisma.referralAttachment.create({
      data: { parentAddress: p, childAddress: c },
    });
    return true;
  } catch (e) {
    if (e.code === "P2002") return false;
    throw e;
  }
}

async function listDirectReferrals(parentLower) {
  const p = String(parentLower || "").toLowerCase();
  const rows = await prisma.referralAttachment.findMany({
    where: { parentAddress: p },
    orderBy: { attachedAt: "asc" },
  });
  return rows.map((r) => ({
    childAddress: r.childAddress,
    attachedAt: r.attachedAt.getTime(),
  }));
}

async function directCount(parentLower) {
  const p = String(parentLower || "").toLowerCase();
  return prisma.referralAttachment.count({ where: { parentAddress: p } });
}

module.exports = { recordAttachment, listDirectReferrals, directCount, levelFromDirectCount };
