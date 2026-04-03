const { prisma } = require("../../lib/prisma");

function normalizeAddress(address) {
  return String(address).toLowerCase();
}

function mapUser(row) {
  if (!row) return null;
  const prefs =
    row.preferences && typeof row.preferences === "object" && !Array.isArray(row.preferences)
      ? row.preferences
      : {};
  return {
    id: row.id,
    address: normalizeAddress(row.address),
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
    referralParent: row.referralParentAddress ? normalizeAddress(row.referralParentAddress) : null,
    preferences: prefs,
  };
}

async function getOrCreateUserByAddress(address) {
  const key = normalizeAddress(address);
  const row = await prisma.user.upsert({
    where: { address: key },
    create: { address: key, preferences: {} },
    update: {},
  });
  return mapUser(row);
}

async function getUserByAddress(address) {
  const key = normalizeAddress(address);
  const row = await prisma.user.findUnique({ where: { address: key } });
  return mapUser(row);
}

async function getUserById(id) {
  const rid = String(id || "").trim();
  if (!rid) return null;
  const row = await prisma.user.findUnique({ where: { id: rid } });
  return mapUser(row);
}

/** Sets referral parent only when currently unset (first attach). */
async function setReferralParentIfUnset(childAddress, parentAddress) {
  const child = normalizeAddress(childAddress);
  const parent = normalizeAddress(parentAddress);
  const result = await prisma.user.updateMany({
    where: { address: child, referralParentAddress: null },
    data: { referralParentAddress: parent },
  });
  return result.count > 0;
}

module.exports = { getOrCreateUserByAddress, getUserByAddress, getUserById, setReferralParentIfUnset };
