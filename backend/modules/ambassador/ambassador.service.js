const Decimal = require("decimal.js");
const { prisma } = require("../../lib/prisma");

const POINTS = { signup: 1, active: 3, trader: 5, deposit: 7 };

const LEVELS = [
  { key: "bronze", label: "Bronze", emoji: "🥉", min: 0, rewardLdx: 100 },
  { key: "silver", label: "Silver", emoji: "🥈", min: 100, rewardLdx: 500 },
  { key: "gold", label: "Gold", emoji: "🥇", min: 500, rewardLdx: 1500 },
  { key: "diamond", label: "Diamond", emoji: "💎", min: 1000, rewardLdx: 5000 }
];

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function assertUsername(u) {
  const s = normalizeUsername(u);
  if (s.length < 3 || s.length > 24) {
    return { ok: false, error: "username must be 3–24 chars (letters, numbers, underscore)" };
  }
  return { ok: true, username: s };
}

function tierForPoints(totalPoints) {
  let cur = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].min) {
      cur = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }
  let progressPct = 100;
  if (next) {
    const span = next.min - cur.min;
    const pos = totalPoints - cur.min;
    progressPct = Math.min(100, Math.floor((pos / span) * 100));
  }
  return { current: cur, next, progressPct };
}

function achievementDefs() {
  return [
    { id: "invites_10", title: "First 10 users invited", icon: "🎯", test: (p) => p.signups >= 10 },
    { id: "invites_50", title: "50 network signups", icon: "🌐", test: (p) => p.signups >= 50 },
    { id: "active_50", title: "50 active users", icon: "⚡", test: (p) => p.activeUsers >= 50 },
    { id: "ldx_1000", title: "1,000 LDX program rewards", icon: "💰", test: (p) => (parseFloat(p.ldxRewarded) || 0) >= 1000 }
  ];
}

async function hasPositiveBalance(userId) {
  const rows = await prisma.cexBalance.findMany({ where: { userId } });
  return rows.some((r) => {
    try {
      return new Decimal(r.available || "0").gt(0) || new Decimal(r.locked || "0").gt(0);
    } catch {
      return false;
    }
  });
}

async function hasTrade(userId) {
  const t = await prisma.cexTrade.findFirst({
    where: { OR: [{ makerUserId: userId }, { takerUserId: userId }] },
    select: { id: true }
  });
  return Boolean(t);
}

async function hasDeposit(userId) {
  const row = await prisma.cexOnchainDeposit.findFirst({ where: { userId }, select: { id: true } });
  return Boolean(row);
}

async function getApprovedAmbassadorUserIdForParentAddress(parentAddressLower) {
  const parent = await prisma.user.findFirst({
    where: { address: { equals: parentAddressLower, mode: "insensitive" } }
  });
  if (!parent) return null;
  const profile = await prisma.ambassadorProfile.findFirst({
    where: { userId: parent.id, status: { in: ["approved", "elite"] } }
  });
  return profile ? parent.id : null;
}

async function ensurePointEvent(ambassadorUserId, childUserId, kind, points, mk) {
  const profile = await prisma.ambassadorProfile.findFirst({
    where: { userId: ambassadorUserId, status: { in: ["approved", "elite"] } }
  });
  if (!profile) return false;
  try {
    await prisma.ambassadorPointEvent.create({
      data: {
        ambassadorUserId,
        childUserId,
        kind,
        points,
        monthKey: mk || monthKey()
      }
    });
    return true;
  } catch (e) {
    if (e?.code === "P2002") return false;
    throw e;
  }
}

async function recomputeAggregates(ambassadorUserId) {
  const evts = await prisma.ambassadorPointEvent.findMany({ where: { ambassadorUserId } });
  const signups = evts.filter((e) => e.kind === "signup").length;
  const activeUsers = evts.filter((e) => e.kind === "active").length;
  const traders = evts.filter((e) => e.kind === "trader").length;
  const deposits = evts.filter((e) => e.kind === "deposit").length;
  const totalPoints = evts.reduce((s, e) => s + e.points, 0);
  await prisma.ambassadorProfile.update({
    where: { userId: ambassadorUserId },
    data: { signups, activeUsers, traders, deposits, totalPoints }
  });
}

async function syncAmbassadorMetrics(ambassadorUserId) {
  const profile = await prisma.ambassadorProfile.findUnique({ where: { userId: ambassadorUserId } });
  if (!profile || profile.status === "banned") return;
  const ambUser = await prisma.user.findUnique({ where: { id: ambassadorUserId } });
  if (!ambUser) return;
  const parentAddr = String(ambUser.address).toLowerCase();
  const attachments = await prisma.referralAttachment.findMany({ where: { parentAddress: parentAddr } });
  const mk = monthKey();
  for (const att of attachments) {
    const child = await prisma.user.findFirst({
      where: { address: { equals: att.childAddress, mode: "insensitive" } }
    });
    if (!child) continue;
    const created = await ensurePointEvent(ambassadorUserId, child.id, "signup", POINTS.signup, mk);
    if (created) await recomputeAggregates(ambassadorUserId);
    if (await hasPositiveBalance(child.id)) {
      const c2 = await ensurePointEvent(ambassadorUserId, child.id, "active", POINTS.active, mk);
      if (c2) await recomputeAggregates(ambassadorUserId);
    }
    if (await hasTrade(child.id)) {
      const c3 = await ensurePointEvent(ambassadorUserId, child.id, "trader", POINTS.trader, mk);
      if (c3) await recomputeAggregates(ambassadorUserId);
    }
    if (await hasDeposit(child.id)) {
      const c4 = await ensurePointEvent(ambassadorUserId, child.id, "deposit", POINTS.deposit, mk);
      if (c4) await recomputeAggregates(ambassadorUserId);
    }
  }
  await recomputeAggregates(ambassadorUserId);
}

async function onReferralAttached(parentAddressLower, childAddressLower) {
  try {
    const ambassadorUserId = await getApprovedAmbassadorUserIdForParentAddress(parentAddressLower);
    if (!ambassadorUserId) return;
    const child = await prisma.user.findFirst({
      where: { address: { equals: childAddressLower, mode: "insensitive" } }
    });
    if (!child) return;
    const mk = monthKey();
    const created = await ensurePointEvent(ambassadorUserId, child.id, "signup", POINTS.signup, mk);
    if (created) await recomputeAggregates(ambassadorUserId);
  } catch (e) {
    console.warn("[ambassador] onReferralAttached", e?.message || e);
  }
}

async function ambassadorParentForChildUserId(childUserId) {
  const child = await prisma.user.findUnique({ where: { id: childUserId } });
  if (!child?.referralParentAddress) return null;
  return getApprovedAmbassadorUserIdForParentAddress(String(child.referralParentAddress).toLowerCase());
}

async function onUserDeposit(childUserId) {
  try {
    const ambassadorUserId = await ambassadorParentForChildUserId(childUserId);
    if (!ambassadorUserId) return;
    const mk = monthKey();
    const created = await ensurePointEvent(ambassadorUserId, childUserId, "deposit", POINTS.deposit, mk);
    if (created) await recomputeAggregates(ambassadorUserId);
  } catch (e) {
    console.warn("[ambassador] onUserDeposit", e?.message || e);
  }
}

async function onCexTradeUser(userId) {
  try {
    const ambassadorUserId = await ambassadorParentForChildUserId(userId);
    if (!ambassadorUserId) return;
    const mk = monthKey();
    let created = await ensurePointEvent(ambassadorUserId, userId, "trader", POINTS.trader, mk);
    if (created) await recomputeAggregates(ambassadorUserId);
    if (await hasPositiveBalance(userId)) {
      created = await ensurePointEvent(ambassadorUserId, userId, "active", POINTS.active, mk);
      if (created) await recomputeAggregates(ambassadorUserId);
    }
  } catch (e) {
    console.warn("[ambassador] onCexTradeUser", e?.message || e);
  }
}

async function notifyTradeUsersForOrder(orderId) {
  if (!orderId) return;
  try {
    const trades = await prisma.cexTrade.findMany({
      where: { OR: [{ makerOrderId: orderId }, { takerOrderId: orderId }] },
      select: { makerUserId: true, takerUserId: true }
    });
    const ids = new Set();
    for (const t of trades) {
      ids.add(t.makerUserId);
      ids.add(t.takerUserId);
    }
    for (const uid of ids) {
      void onCexTradeUser(uid);
    }
  } catch (e) {
    console.warn("[ambassador] notifyTradeUsersForOrder", e?.message || e);
  }
}

async function resolveUsername(username) {
  const u = normalizeUsername(username);
  if (!u) return { ok: false, error: "invalid username" };
  const profile = await prisma.ambassadorProfile.findFirst({
    where: { publicUsername: u, status: { in: ["approved", "elite"] } },
    include: { user: { select: { address: true } } }
  });
  if (!profile) return { ok: false, error: "not found" };
  return { ok: true, refAddress: String(profile.user.address).toLowerCase(), username: profile.publicUsername };
}

async function apply({ user, body }) {
  if (!user?.id) return { ok: false, error: "not authenticated" };
  const existingProfile = await prisma.ambassadorProfile.findUnique({ where: { userId: user.id } });
  if (existingProfile && existingProfile.status !== "banned") {
    return { ok: false, error: "already an ambassador" };
  }
  const un = assertUsername(body?.username);
  if (!un.ok) return { ok: false, error: un.error };
  const taken = await prisma.ambassadorProfile.findFirst({
    where: { publicUsername: un.username }
  });
  if (taken) return { ok: false, error: "username already taken" };

  const fullName = String(body?.fullName || "").trim();
  const telegram = String(body?.telegram || "").trim();
  const twitter = String(body?.twitter || "").trim();
  const country = String(body?.country || "").trim();
  const promoExperience = String(body?.promoExperience || "").trim();
  const promotePlan = String(body?.promotePlan || "").trim();
  if (!fullName || !telegram || !twitter || !country || !promoExperience || !promotePlan) {
    return { ok: false, error: "missing required fields" };
  }

  await prisma.ambassadorApplication.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName,
      username: un.username,
      telegram,
      twitter,
      country,
      promoExperience,
      promotePlan,
      youtube: body?.youtube ? String(body.youtube).trim().slice(0, 500) : null,
      discord: body?.discord ? String(body.discord).trim().slice(0, 200) : null,
      website: body?.website ? String(body.website).trim().slice(0, 500) : null,
      status: "pending"
    },
    update: {
      fullName,
      username: un.username,
      telegram,
      twitter,
      country,
      promoExperience,
      promotePlan,
      youtube: body?.youtube ? String(body.youtube).trim().slice(0, 500) : null,
      discord: body?.discord ? String(body.discord).trim().slice(0, 200) : null,
      website: body?.website ? String(body.website).trim().slice(0, 500) : null,
      status: "pending",
      reviewNote: null
    }
  });
  return { ok: true };
}

async function me({ user }) {
  if (!user?.id) return { ok: false, error: "not authenticated" };
  const application = await prisma.ambassadorApplication.findUnique({ where: { userId: user.id } });
  const profile = await prisma.ambassadorProfile.findUnique({ where: { userId: user.id } });
  if (profile && profile.status !== "banned") {
    await syncAmbassadorMetrics(user.id);
  }
  const refreshed = profile
    ? await prisma.ambassadorProfile.findUnique({ where: { userId: user.id } })
    : null;
  const mk = monthKey();
  let rank = null;
  if (refreshed && refreshed.status !== "banned") {
    const agg = await prisma.ambassadorPointEvent.groupBy({
      by: ["ambassadorUserId"],
      where: { monthKey: mk },
      _sum: { points: true }
    });
    const sorted = agg
      .filter((r) => r._sum.points > 0)
      .sort((a, b) => (b._sum.points || 0) - (a._sum.points || 0));
    const idx = sorted.findIndex((r) => r.ambassadorUserId === user.id);
    rank = idx >= 0 ? idx + 1 : null;
  }
  const tier = refreshed ? tierForPoints(refreshed.totalPoints) : null;
  const achievements = refreshed
    ? achievementDefs().map((a) => ({
        id: a.id,
        title: a.title,
        icon: a.icon,
        unlocked: a.test(refreshed)
      }))
    : [];

  const rewards = refreshed
    ? await prisma.ambassadorReward.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    : [];

  return {
    ok: true,
    application,
    profile: refreshed,
    referralPath: refreshed ? `/ambassador/ref/${refreshed.publicUsername}` : null,
    tier,
    achievements,
    rankThisMonth: rank,
    monthKey: mk,
    levels: LEVELS,
    rewards,
    performanceMilestones: [
      { activeUsers: 100, ldx: 100 },
      { activeUsers: 500, ldx: 500 },
      { activeUsers: 1000, ldx: 1500 }
    ]
  };
}

async function leaderboard({ month }) {
  const mk = month && /^\d{4}-\d{2}$/.test(month) ? month : monthKey();
  const agg = await prisma.ambassadorPointEvent.groupBy({
    by: ["ambassadorUserId"],
    where: { monthKey: mk },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: 50
  });
  const rows = [];
  let rank = 0;
  for (let i = 0; i < agg.length; i++) {
    const r = agg[i];
    const pts = r._sum.points || 0;
    if (pts <= 0) continue;
    const profile = await prisma.ambassadorProfile.findUnique({
      where: { userId: r.ambassadorUserId },
      select: { publicUsername: true, status: true }
    });
    if (!profile || profile.status === "banned") continue;
    rank += 1;
    const lifetime =
      (
        await prisma.ambassadorPointEvent.aggregate({
          where: { ambassadorUserId: r.ambassadorUserId },
          _sum: { points: true }
        })
      )._sum.points || 0;
    const tier = tierForPoints(lifetime);
    rows.push({
      rank,
      username: profile.publicUsername,
      pointsThisMonth: pts,
      badge: tier.current.emoji,
      status: profile.status
    });
  }
  return { ok: true, monthKey: mk, rows };
}

async function adminListApplications() {
  const rows = await prisma.ambassadorApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { address: true } } }
  });
  return { ok: true, applications: rows };
}

async function adminReviewApplication(id, { decision, note }) {
  const dec = String(decision || "").toLowerCase();
  if (dec !== "approve" && dec !== "reject") return { ok: false, error: "decision must be approve or reject" };
  const app = await prisma.ambassadorApplication.findUnique({ where: { id: String(id) } });
  if (!app) return { ok: false, error: "not found" };
  if (app.status !== "pending") return { ok: false, error: "not pending" };

  if (dec === "reject") {
    await prisma.ambassadorApplication.update({
      where: { id: app.id },
      data: { status: "rejected", reviewNote: note ? String(note).slice(0, 2000) : null }
    });
    return { ok: true };
  }

  const un = assertUsername(app.username);
  if (!un.ok) return { ok: false, error: un.error };
  const taken = await prisma.ambassadorProfile.findFirst({ where: { publicUsername: un.username } });
  if (taken) return { ok: false, error: "username already taken" };

  await prisma.$transaction(async (tx) => {
    await tx.ambassadorApplication.update({
      where: { id: app.id },
      data: { status: "approved", reviewNote: note ? String(note).slice(0, 2000) : null }
    });
    await tx.ambassadorProfile.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId,
        publicUsername: un.username,
        status: "approved"
      },
      update: {
        publicUsername: un.username,
        status: "approved"
      }
    });
  });

  return { ok: true };
}

async function adminListProfiles() {
  const rows = await prisma.ambassadorProfile.findMany({
    orderBy: { totalPoints: "desc" },
    take: 200,
    include: { user: { select: { address: true } } }
  });
  return { ok: true, profiles: rows };
}

async function adminPatchProfile(userId, body) {
  const status = body?.status != null ? String(body.status).toLowerCase() : null;
  if (status && !["approved", "elite", "banned"].includes(status)) {
    return { ok: false, error: "invalid status" };
  }
  const profile = await prisma.ambassadorProfile.findUnique({ where: { userId: String(userId) } });
  if (!profile) return { ok: false, error: "not found" };
  await prisma.ambassadorProfile.update({
    where: { userId: profile.userId },
    data: {
      ...(status ? { status } : {})
    }
  });
  return { ok: true };
}

async function adminGrantReward(userId, body) {
  const uid = String(userId);
  const amount = String(body?.amountLdx || "").trim();
  const kind = String(body?.kind || "manual").slice(0, 64);
  const note = body?.note ? String(body.note).slice(0, 2000) : null;
  const month = body?.monthKey ? String(body.monthKey).slice(0, 7) : null;
  if (!amount || Number.isNaN(parseFloat(amount))) return { ok: false, error: "invalid amountLdx" };
  const profile = await prisma.ambassadorProfile.findUnique({ where: { userId: uid } });
  if (!profile) return { ok: false, error: "profile not found" };
  const next = new Decimal(profile.ldxRewarded || "0").plus(new Decimal(amount));
  await prisma.$transaction([
    prisma.ambassadorReward.create({
      data: { userId: uid, kind, amountLdx: amount, monthKey: month, note }
    }),
    prisma.ambassadorProfile.update({
      where: { userId: uid },
      data: { ldxRewarded: next.toFixed(8) }
    })
  ]);
  return { ok: true };
}

module.exports = {
  POINTS,
  LEVELS,
  monthKey,
  normalizeUsername,
  resolveUsername,
  apply,
  me,
  leaderboard,
  onReferralAttached,
  onUserDeposit,
  onCexTradeUser,
  notifyTradeUsersForOrder,
  syncAmbassadorMetrics,
  adminListApplications,
  adminReviewApplication,
  adminListProfiles,
  adminPatchProfile,
  adminGrantReward
};
