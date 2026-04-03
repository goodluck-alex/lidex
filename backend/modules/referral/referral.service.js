const referralModel = require("./referral.model");
const referralLedger = require("./referral.ledger");
const referralGraph = require("./referral.graph");
const { getUserByAddress, setReferralParentIfUnset } = require("../users/users.model");

async function link({ user }) {
  return {
    ok: true,
    link: referralModel.linkForUser(user),
    code: user?.address ? referralModel.codeForAddress(user.address) : null,
    user: user || null,
  };
}

async function stats({ user }) {
  const stats = referralModel.emptyStats();
  const ledger = user?.address ? await referralLedger.listByUserAddress(user.address) : [];
  const earned = user?.address
    ? ledger
        .filter((e) => e.parentAddress === String(user.address).toLowerCase())
        .reduce((sum, e) => sum + Number(e.amountUsd || 0), 0)
    : 0;
  stats.earnedUsd = Number.isFinite(earned) ? earned : 0;

  if (user?.address) {
    const a = String(user.address).toLowerCase();
    const referred = await referralGraph.listDirectReferrals(a);
    stats.direct = referred.length;
    stats.level = referralGraph.levelFromDirectCount(referred.length);
    stats.referredUsers = referred.map((r) => ({
      address: r.childAddress,
      attachedAt: r.attachedAt,
    }));
  } else {
    stats.referredUsers = [];
  }

  return { ok: true, stats, ledger, user: user || null };
}

async function users({ user }) {
  if (!user?.address) return { ok: true, users: [], user: null };
  const list = await referralGraph.listDirectReferrals(user.address);
  return {
    ok: true,
    users: list.map((r) => ({ address: r.childAddress, attachedAt: r.attachedAt })),
    user,
  };
}

async function attach({ user, refCode }) {
  if (!user?.address) return { ok: false, error: "not authenticated" };
  const raw = String(refCode || "").trim();
  if (raw.length > 128) return { ok: false, error: "invalid ref code" };
  const parentAddress = raw.toLowerCase();
  if (!parentAddress.startsWith("0x") || parentAddress.length !== 42) return { ok: false, error: "invalid ref code" };
  if (parentAddress === String(user.address).toLowerCase()) return { ok: false, error: "cannot refer yourself" };
  const parent = await getUserByAddress(parentAddress);
  if (!parent) return { ok: false, error: "referrer not found" };
  if (user.referralParent) {
    return { ok: true, attached: false, referralParent: user.referralParent };
  }

  const childAddr = String(user.address).toLowerCase();
  const inserted = await referralGraph.recordAttachment(parentAddress, childAddr);
  if (!inserted) {
    const refreshed = await getUserByAddress(childAddr);
    if (refreshed?.referralParent === parentAddress) {
      return { ok: true, attached: false, referralParent: parentAddress };
    }
    await setReferralParentIfUnset(childAddr, parentAddress);
    return { ok: true, attached: false, referralParent: parentAddress };
  }

  await setReferralParentIfUnset(childAddr, parentAddress);
  return { ok: true, attached: true, referralParent: parentAddress };
}

module.exports = { link, stats, users, attach };
