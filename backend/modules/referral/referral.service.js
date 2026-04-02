const referralModel = require("./referral.model");
const referralLedger = require("./referral.ledger");
const { getUserByAddress } = require("../users/users.model");

async function link({ user }) {
  return { ok: true, link: referralModel.linkForUser(user), code: user?.address ? referralModel.codeForAddress(user.address) : null, user: user || null };
}

async function stats({ user }) {
  const stats = referralModel.emptyStats();
  const ledger = user?.address ? referralLedger.listByUserAddress(user.address) : [];
  const earned = ledger
    .filter((e) => e.parentAddress === String(user.address).toLowerCase())
    .reduce((sum, e) => sum + Number(e.amountUsd || 0), 0);
  stats.earnedUsd = Number.isFinite(earned) ? earned : 0;
  return { ok: true, stats, ledger, user: user || null };
}

async function users({ user }) {
  return { ok: true, users: [], user: user || null };
}

async function attach({ user, refCode }) {
  if (!user?.address) return { ok: false, error: "not authenticated" };
  const parentAddress = String(refCode || "").toLowerCase();
  if (!parentAddress.startsWith("0x") || parentAddress.length !== 42) return { ok: false, error: "invalid ref code" };
  if (parentAddress === String(user.address).toLowerCase()) return { ok: false, error: "cannot refer yourself" };
  const parent = getUserByAddress(parentAddress);
  // Phase 1: parent must exist (i.e., have logged in at least once)
  if (!parent) return { ok: false, error: "referrer not found" };
  if (user.referralParent) return { ok: true, attached: false, referralParent: user.referralParent };
  user.referralParent = parentAddress;
  return { ok: true, attached: true, referralParent: parentAddress };
}

module.exports = { link, stats, users, attach };

