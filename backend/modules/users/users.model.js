const crypto = require("crypto");
const { prisma } = require("../../lib/prisma");

function normalizeAddress(address) {
  return String(address).toLowerCase();
}

function randomReferralCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i += 1) {
    s += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return s;
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
    referralCode: row.referralCode ? String(row.referralCode) : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt),
    referralParent: row.referralParentAddress ? normalizeAddress(row.referralParentAddress) : null,
    preferences: prefs,
  };
}

/** Assign a unique referral code once the user row exists (required before sharing ?ref=). */
async function ensureReferralCodeForUserId(userId) {
  const rid = String(userId || "").trim();
  if (!rid) return null;
  const existing = await prisma.user.findUnique({ where: { id: rid }, select: { referralCode: true } });
  if (!existing) return null;
  if (existing.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const code = randomReferralCode();
    try {
      await prisma.user.update({ where: { id: rid }, data: { referralCode: code } });
      return code;
    } catch (e) {
      if (e?.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("could not allocate referral code");
}

async function getOrCreateUserByAddress(address) {
  const key = normalizeAddress(address);
  const row = await prisma.user.upsert({
    where: { address: key },
    create: { address: key, preferences: {} },
    update: {},
  });
  await ensureReferralCodeForUserId(row.id);
  const fresh = await prisma.user.findUnique({ where: { address: key } });
  return mapUser(fresh);
}

async function getUserByAddress(address) {
  const key = normalizeAddress(address);
  const row = await prisma.user.findUnique({ where: { address: key } });
  if (!row) return null;
  await ensureReferralCodeForUserId(row.id);
  const fresh = await prisma.user.findUnique({ where: { address: key } });
  return mapUser(fresh);
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

module.exports = {
  getOrCreateUserByAddress,
  getUserByAddress,
  getUserById,
  setReferralParentIfUnset,
  ensureReferralCodeForUserId,
  mapUser,
};
