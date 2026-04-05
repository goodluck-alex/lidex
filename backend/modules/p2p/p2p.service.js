const { prisma } = require("../../lib/prisma");

function peerLabel(address) {
  if (!address || String(address).length < 10) return address ? String(address).slice(0, 8) : "—";
  const a = String(address).toLowerCase();
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function toNum(s) {
  const n = Number(String(s || "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function assertPositiveDecimalString(v, field) {
  const n = toNum(v);
  if (!Number.isFinite(n) || n <= 0) {
    const e = new Error(`${field} must be a positive number`);
    e.code = "BAD_REQUEST";
    throw e;
  }
  return String(v).trim();
}

async function getMerchantVerified(userId) {
  const p = await prisma.p2pMerchantProfile.findUnique({ where: { userId } });
  return !!(p && p.verified);
}

async function maybeExpireOrder(row) {
  if (!row) return row;
  if (["completed", "cancelled", "expired"].includes(row.status)) return row;
  if (new Date() > new Date(row.expiresAt) && row.status === "awaiting_payment") {
    await prisma.p2pOrder.update({ where: { id: row.id }, data: { status: "expired" } });
    return { ...row, status: "expired" };
  }
  return row;
}

/**
 * flow=buy → user buys crypto → list ads where poster sells (side sell).
 * flow=sell → user sells crypto → list ads where poster buys (side buy).
 */
async function listAds({ query }) {
  const flow = String(query?.flow || "buy").toLowerCase();
  const token = String(query?.token || "USDT").toUpperCase();
  const fiat = String(query?.fiat || "UGX").toUpperCase();
  const side = flow === "sell" ? "buy" : "sell";
  const merchantOnly = String(query?.merchant || "") === "1";
  const payFilter = String(query?.payment || "").trim().toLowerCase();

  const ads = await prisma.p2pAd.findMany({
    where: {
      status: "active",
      tokenSymbol: token,
      fiatCurrency: fiat,
      side,
      ...(merchantOnly
        ? { user: { p2pMerchantProfile: { is: { verified: true } } } }
        : {}),
    },
    include: {
      user: { select: { address: true, id: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const verifiedMap = new Map();
  for (const ad of ads) {
    verifiedMap.set(ad.userId, await getMerchantVerified(ad.userId));
  }

  let rows = ads.map((ad) => ({
    id: ad.id,
    side: ad.side,
    tokenSymbol: ad.tokenSymbol,
    fiatCurrency: ad.fiatCurrency,
    priceType: ad.priceType,
    price: ad.price,
    amountMin: ad.amountMin,
    amountMax: ad.amountMax,
    paymentMethodLabel: ad.paymentMethodLabel,
    timeLimitMinutes: ad.timeLimitMinutes,
    terms: ad.terms,
    merchantLabel: peerLabel(ad.user.address),
    merchantVerified: verifiedMap.get(ad.userId),
    orderCount: ad._count.orders,
  }));

  if (payFilter) {
    rows = rows.filter((r) => String(r.paymentMethodLabel).toLowerCase().includes(payFilter));
  }

  const priceAsc = (a, b) => toNum(a.price) - toNum(b.price);
  const priceDesc = (a, b) => toNum(b.price) - toNum(a.price);
  rows.sort(flow === "buy" ? priceAsc : priceDesc);

  return { ok: true, flow, token, fiat, ads: rows };
}

async function expressMatch({ body }) {
  const flow = String(body?.flow || "buy").toLowerCase();
  const token = String(body?.token || "USDT").toUpperCase();
  const fiat = String(body?.fiat || "UGX").toUpperCase();
  const amountFiat = assertPositiveDecimalString(body?.amountFiat ?? body?.amount, "amountFiat");
  const payment = String(body?.paymentMethod || body?.payment || "").trim();

  const { ads } = await listAds({ query: { flow, token, fiat } });
  const amt = toNum(amountFiat);
  const filtered = ads.filter((a) => {
    const ok =
      toNum(a.amountMin) <= amt &&
      toNum(a.amountMax) >= amt &&
      (!payment || String(a.paymentMethodLabel).toLowerCase().includes(payment.toLowerCase()));
    return ok;
  });
  const best = filtered[0];
  if (!best) return { ok: true, matched: false, ad: null };
  return { ok: true, matched: true, ad: best };
}

async function createAd({ user, body }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const side = String(body?.side || "").toLowerCase();
  if (side !== "buy" && side !== "sell") {
    const e = new Error("side must be buy or sell");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const tokenSymbol = String(body?.tokenSymbol || "USDT").toUpperCase();
  const fiatCurrency = String(body?.fiatCurrency || "UGX").toUpperCase();
  const priceType = String(body?.priceType || "fixed").toLowerCase();
  if (priceType !== "fixed" && priceType !== "market") {
    const e = new Error("priceType must be fixed or market");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const price = assertPositiveDecimalString(body?.price, "price");
  const amountMin = assertPositiveDecimalString(body?.amountMin, "amountMin");
  const amountMax = assertPositiveDecimalString(body?.amountMax, "amountMax");
  if (toNum(amountMin) > toNum(amountMax)) {
    const e = new Error("amountMin cannot exceed amountMax");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const paymentMethodLabel = String(body?.paymentMethodLabel || body?.paymentMethod || "").trim();
  if (!paymentMethodLabel) {
    const e = new Error("paymentMethodLabel is required");
    e.code = "BAD_REQUEST";
    throw e;
  }
  let timeLimitMinutes = Number(body?.timeLimitMinutes ?? 15);
  if (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes < 5 || timeLimitMinutes > 180) {
    timeLimitMinutes = 15;
  }
  const terms = body?.terms != null ? String(body.terms).slice(0, 4000) : null;

  const ad = await prisma.p2pAd.create({
    data: {
      userId: user.id,
      side,
      tokenSymbol,
      fiatCurrency,
      priceType,
      price,
      amountMin,
      amountMax,
      paymentMethodLabel,
      timeLimitMinutes,
      terms,
      status: "active",
    },
  });
  return { ok: true, ad };
}

async function listMyAds({ user }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const ads = await prisma.p2pAd.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });
  return {
    ok: true,
    ads: ads.map((a) => ({
      id: a.id,
      status: a.status,
      side: a.side,
      tokenSymbol: a.tokenSymbol,
      fiatCurrency: a.fiatCurrency,
      priceType: a.priceType,
      price: a.price,
      amountMin: a.amountMin,
      amountMax: a.amountMax,
      paymentMethodLabel: a.paymentMethodLabel,
      timeLimitMinutes: a.timeLimitMinutes,
      orderCount: a._count.orders,
      updatedAt: a.updatedAt.toISOString(),
    })),
  };
}

async function updateAd({ user, adId, body }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(adId || "").trim();
  const existing = await prisma.p2pAd.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false, error: "ad not found" };

  const data = {};
  if (body?.status === "paused" || body?.status === "active") data.status = body.status;
  if (body?.price != null) data.price = assertPositiveDecimalString(body.price, "price");
  if (body?.amountMin != null) data.amountMin = assertPositiveDecimalString(body.amountMin, "amountMin");
  if (body?.amountMax != null) data.amountMax = assertPositiveDecimalString(body.amountMax, "amountMax");
  if (Object.keys(data).length === 0) return { ok: false, error: "no valid fields" };

  if (data.amountMin != null && data.amountMax != null && toNum(data.amountMin) > toNum(data.amountMax)) {
    return { ok: false, error: "amountMin cannot exceed amountMax" };
  }
  const nextMin = data.amountMin ?? existing.amountMin;
  const nextMax = data.amountMax ?? existing.amountMax;
  if (toNum(nextMin) > toNum(nextMax)) {
    return { ok: false, error: "amountMin cannot exceed amountMax" };
  }

  const ad = await prisma.p2pAd.update({ where: { id }, data });
  return { ok: true, ad };
}

async function deleteAd({ user, adId }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(adId || "").trim();
  const existing = await prisma.p2pAd.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { ok: false, error: "ad not found" };

  const activeOrders = await prisma.p2pOrder.count({
    where: {
      adId: id,
      status: { in: ["awaiting_payment", "buyer_paid"] },
    },
  });
  if (activeOrders > 0) return { ok: false, error: "cannot delete ad with active orders" };

  await prisma.p2pAd.delete({ where: { id } });
  return { ok: true };
}

async function createOrder({ user, body }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const adId = String(body?.adId || "").trim();
  const fiatAmount = assertPositiveDecimalString(body?.fiatAmount, "fiatAmount");
  const ad = await prisma.p2pAd.findFirst({ where: { id: adId, status: "active" } });
  if (!ad) {
    const e = new Error("ad not found or not active");
    e.code = "BAD_REQUEST";
    throw e;
  }
  if (ad.userId === user.id) {
    const e = new Error("cannot trade on your own ad");
    e.code = "BAD_REQUEST";
    throw e;
  }

  const amt = toNum(fiatAmount);
  if (amt < toNum(ad.amountMin) || amt > toNum(ad.amountMax)) {
    const e = new Error("amount outside ad limits");
    e.code = "BAD_REQUEST";
    throw e;
  }

  const price = toNum(ad.price);
  const tokenAmount = (amt / price).toFixed(8);

  let buyerUserId;
  let sellerUserId;
  if (ad.side === "sell") {
    sellerUserId = ad.userId;
    buyerUserId = user.id;
  } else {
    buyerUserId = ad.userId;
    sellerUserId = user.id;
  }

  const expiresAt = new Date(Date.now() + ad.timeLimitMinutes * 60 * 1000);

  const order = await prisma.p2pOrder.create({
    data: {
      adId: ad.id,
      buyerUserId,
      sellerUserId,
      fiatAmount,
      tokenAmount,
      price: ad.price,
      status: "awaiting_payment",
      expiresAt,
    },
  });

  return { ok: true, order };
}

async function listMyOrders({ user }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  let orders = await prisma.p2pOrder.findMany({
    where: { OR: [{ buyerUserId: user.id }, { sellerUserId: user.id }] },
    include: {
      ad: { select: { tokenSymbol: true, fiatCurrency: true, paymentMethodLabel: true } },
      buyer: { select: { address: true } },
      seller: { select: { address: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });
  orders = await Promise.all(orders.map((o) => maybeExpireOrder(o)));
  return {
    ok: true,
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      fiatAmount: o.fiatAmount,
      tokenAmount: o.tokenAmount,
      price: o.price,
      expiresAt: o.expiresAt.toISOString(),
      tokenSymbol: o.ad.tokenSymbol,
      fiatCurrency: o.ad.fiatCurrency,
      paymentMethodLabel: o.ad.paymentMethodLabel,
      buyerLabel: peerLabel(o.buyer.address),
      sellerLabel: peerLabel(o.seller.address),
      role: o.buyerUserId === user.id ? "buyer" : "seller",
    })),
  };
}

async function getOrder({ user, orderId }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(orderId || "").trim();
  const row = await prisma.p2pOrder.findFirst({
    where: { id, OR: [{ buyerUserId: user.id }, { sellerUserId: user.id }] },
    include: {
      ad: true,
      buyer: { select: { address: true } },
      seller: { select: { address: true } },
    },
  });
  if (!row) return { ok: false, error: "order not found" };
  const order = await maybeExpireOrder(row);
  return {
    ok: true,
    order: {
      id: order.id,
      status: order.status,
      fiatAmount: order.fiatAmount,
      tokenAmount: order.tokenAmount,
      price: order.price,
      expiresAt: order.expiresAt.toISOString(),
      createdAt: order.createdAt.toISOString(),
      role: order.buyerUserId === user.id ? "buyer" : "seller",
      buyerLabel: peerLabel(order.buyer.address),
      sellerLabel: peerLabel(order.seller.address),
      ad: {
        paymentMethodLabel: order.ad.paymentMethodLabel,
        terms: order.ad.terms,
        timeLimitMinutes: order.ad.timeLimitMinutes,
        tokenSymbol: order.ad.tokenSymbol,
        fiatCurrency: order.ad.fiatCurrency,
      },
    },
  };
}

async function markPaid({ user, orderId }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(orderId || "").trim();
  const row = await maybeExpireOrder(
    await prisma.p2pOrder.findFirst({ where: { id, buyerUserId: user.id } })
  );
  if (!row) return { ok: false, error: "order not found" };
  if (row.status !== "awaiting_payment") return { ok: false, error: "invalid status" };
  await prisma.p2pOrder.update({ where: { id }, data: { status: "buyer_paid" } });
  return { ok: true };
}

async function confirmRelease({ user, orderId }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(orderId || "").trim();
  const row = await prisma.p2pOrder.findFirst({ where: { id, sellerUserId: user.id } });
  if (!row) return { ok: false, error: "order not found" };
  if (row.status !== "buyer_paid") return { ok: false, error: "buyer must mark paid first" };
  await prisma.p2pOrder.update({ where: { id }, data: { status: "completed" } });
  return { ok: true };
}

async function cancelOrder({ user, orderId }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(orderId || "").trim();
  const row = await maybeExpireOrder(
    await prisma.p2pOrder.findFirst({
      where: { id, OR: [{ buyerUserId: user.id }, { sellerUserId: user.id }] },
    })
  );
  if (!row) return { ok: false, error: "order not found" };
  if (!["awaiting_payment", "buyer_paid"].includes(row.status)) {
    return { ok: false, error: "cannot cancel this order" };
  }
  await prisma.p2pOrder.update({ where: { id }, data: { status: "cancelled" } });
  return { ok: true };
}

async function listMessages({ user, orderId }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(orderId || "").trim();
  const order = await prisma.p2pOrder.findFirst({
    where: { id, OR: [{ buyerUserId: user.id }, { sellerUserId: user.id }] },
  });
  if (!order) return { ok: false, error: "order not found" };
  const messages = await prisma.p2pChatMessage.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { address: true } } },
    take: 200,
  });
  return {
    ok: true,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      fromLabel: peerLabel(m.user.address),
      mine: m.userId === user.id,
    })),
  };
}

async function postMessage({ user, orderId, body }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const id = String(orderId || "").trim();
  const text = String(body?.body || body?.message || "").trim();
  if (!text || text.length > 2000) {
    const e = new Error("message required (max 2000 chars)");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const order = await prisma.p2pOrder.findFirst({
    where: { id, OR: [{ buyerUserId: user.id }, { sellerUserId: user.id }] },
  });
  if (!order) return { ok: false, error: "order not found" };
  const msg = await prisma.p2pChatMessage.create({
    data: { orderId: id, userId: user.id, body: text },
  });
  return { ok: true, message: { id: msg.id, createdAt: msg.createdAt.toISOString() } };
}

async function listPaymentMethods({ user }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const rows = await prisma.p2pPaymentMethod.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return { ok: true, methods: rows };
}

async function createPaymentMethod({ user, body }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const type = String(body?.type || "mobile_money").trim();
  const label = String(body?.label || body?.paymentType || "").trim() || "Payment";
  const accountName = String(body?.accountName || "").trim();
  const accountValue = String(body?.accountValue || body?.phoneNumber || "").trim();
  const instructions = body?.instructions != null ? String(body.instructions).slice(0, 2000) : null;
  if (!accountName || !accountValue) {
    const e = new Error("accountName and accountValue are required");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const row = await prisma.p2pPaymentMethod.create({
    data: { userId: user.id, type, label, accountName, accountValue, instructions },
  });
  return { ok: true, method: row };
}

async function deletePaymentMethod({ user, id }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const mid = String(id || "").trim();
  const r = await prisma.p2pPaymentMethod.deleteMany({ where: { id: mid, userId: user.id } });
  if (r.count === 0) return { ok: false, error: "not found" };
  return { ok: true };
}

async function applyMerchant({ user, body }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const fullName = String(body?.fullName || "").trim();
  const email = String(body?.email || "").trim();
  const country = String(body?.country || "").trim();
  const tradingExperience = String(body?.tradingExperience || "").trim();
  const reason = String(body?.reason || "").trim();
  if (!fullName || !email || !country || !tradingExperience || !reason) {
    const e = new Error("all fields are required");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const existing = await prisma.p2pMerchantApplication.findFirst({
    where: { userId: user.id, status: "pending" },
  });
  if (existing) return { ok: false, error: "application already pending" };

  const appRow = await prisma.p2pMerchantApplication.create({
    data: {
      userId: user.id,
      fullName,
      email,
      country,
      tradingExperience,
      reason,
      status: "pending",
    },
  });
  return { ok: true, application: appRow };
}

async function merchantStatus({ user }) {
  if (!user?.id) {
    const e = new Error("not authenticated");
    e.code = "UNAUTHORIZED";
    throw e;
  }
  const profile = await prisma.p2pMerchantProfile.findUnique({ where: { userId: user.id } });
  const application = await prisma.p2pMerchantApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return {
    ok: true,
    verified: !!(profile && profile.verified),
    application: application
      ? {
          status: application.status,
          createdAt: application.createdAt.toISOString(),
        }
      : null,
  };
}

module.exports = {
  listAds,
  expressMatch,
  createAd,
  listMyAds,
  updateAd,
  deleteAd,
  createOrder,
  listMyOrders,
  getOrder,
  markPaid,
  confirmRelease,
  cancelOrder,
  listMessages,
  postMessage,
  listPaymentMethods,
  createPaymentMethod,
  deletePaymentMethod,
  applyMerchant,
  merchantStatus,
};
