const Decimal = require("decimal.js");
const { Prisma } = require("@prisma/client");
const { prisma } = require("../../lib/prisma");
const { getBalanceRow, d } = require("../cex/cex.balances");
const { CEX_QUOTE_ASSET } = require("../cex/cex.config");
const stakingService = require("../staking/staking.service");

Decimal.set({ precision: 50, rounding: Decimal.ROUND_DOWN });

function launchpadEnabled() {
  return String(process.env.LAUNCHPAD_ENABLED || "").toLowerCase() === "true";
}

function slugOk(s) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(s || ""));
}

function assetSym(s) {
  return String(s || "").trim().toUpperCase().slice(0, 32);
}

function serializeSaleRow(s) {
  const total = d(s.totalOfferTokens);
  const sold = d(s.soldTokens);
  const remaining = total.minus(sold);
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    summary: s.summary,
    offerAsset: s.offerAsset,
    payAsset: s.payAsset,
    pricePayPerToken: s.pricePayPerToken,
    totalOfferTokens: s.totalOfferTokens,
    soldTokens: s.soldTokens,
    remainingTokens: remaining.toString(),
    minTierRank: s.minTierRank,
    status: s.status,
    startsAt: s.startsAt ? s.startsAt.toISOString() : null,
    endsAt: s.endsAt ? s.endsAt.toISOString() : null,
  };
}

async function listSalesPublic() {
  if (!launchpadEnabled()) return { ok: true, enabled: false, sales: [] };
  const rows = await prisma.launchpadSale.findMany({
    where: { status: { not: "draft" } },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  });
  return { ok: true, enabled: true, quoteAsset: CEX_QUOTE_ASSET, sales: rows.map(serializeSaleRow) };
}

async function getSale(slugOrId) {
  if (!launchpadEnabled()) return { ok: false, error: "launchpad disabled", code: "DISABLED" };
  const raw = String(slugOrId || "").trim();
  if (!raw) return { ok: false, error: "id or slug required", code: "BAD_REQUEST" };
  const row = await prisma.launchpadSale.findFirst({
    where: { OR: [{ id: raw }, { slug: raw.toLowerCase() }] },
  });
  if (!row || row.status === "draft") return { ok: false, error: "not found", code: "NOT_FOUND" };
  return { ok: true, quoteAsset: CEX_QUOTE_ASSET, sale: serializeSaleRow(row) };
}

function saleWindowOpen(sale, now = new Date()) {
  if (sale.startsAt && now < sale.startsAt) return false;
  if (sale.endsAt && now > sale.endsAt) return false;
  return true;
}

/**
 * @param {{ user?: { id: string } | null; body?: { saleId?: string; payAmount?: string } }} opts
 */
async function participate(opts) {
  if (!launchpadEnabled()) return { ok: false, error: "launchpad disabled", code: "DISABLED" };
  const user = opts.user;
  const body = opts.body || {};
  if (!user?.id) return { ok: false, error: "not authenticated", code: "UNAUTHENTICATED" };

  const saleId = String(body.saleId || "").trim();
  const payRaw = body.payAmount;
  if (!saleId) return { ok: false, error: "saleId is required", code: "BAD_REQUEST" };
  const payBudget = d(payRaw);
  if (!payRaw || payBudget.lte(0)) return { ok: false, error: "payAmount must be positive", code: "BAD_AMOUNT" };

  try {
    const out = await prisma.$transaction(
      async (tx) => {
        const sale = await tx.launchpadSale.findUnique({ where: { id: saleId } });
        if (!sale) {
          const err = new Error("sale not found");
          err.code = "NOT_FOUND";
          throw err;
        }
        if (sale.status !== "live") {
          const err = new Error("sale is not live");
          err.code = "NOT_LIVE";
          throw err;
        }
        if (!saleWindowOpen(sale)) {
          const err = new Error("sale is outside its time window");
          err.code = "NOT_IN_WINDOW";
          throw err;
        }
        if (String(sale.payAsset).toUpperCase() !== String(CEX_QUOTE_ASSET).toUpperCase()) {
          const err = new Error("sale pay asset is misconfigured");
          err.code = "MISCONFIG";
          throw err;
        }
        if (sale.minTierRank > 0) {
          const rank = await stakingService.userTierRank(user.id);
          if (rank < sale.minTierRank) {
            const err = new Error(`staking tier rank ${sale.minTierRank} or higher required`);
            err.code = "TIER_REQUIRED";
            throw err;
          }
        }

        const price = d(sale.pricePayPerToken);
        if (price.lte(0)) {
          const err = new Error("invalid sale price");
          err.code = "MISCONFIG";
          throw err;
        }

        const remainingTok = d(sale.totalOfferTokens).minus(d(sale.soldTokens));
        if (remainingTok.lte(0)) {
          const err = new Error("sold out");
          err.code = "SOLD_OUT";
          throw err;
        }

        const tokensUncapped = payBudget.div(price).toDecimalPlaces(40, Decimal.ROUND_DOWN);
        const tokens = Decimal.min(tokensUncapped, remainingTok).toDecimalPlaces(40, Decimal.ROUND_DOWN);
        if (tokens.lte(0)) {
          const err = new Error("pay amount too small to receive tokens");
          err.code = "AMOUNT_TOO_SMALL";
          throw err;
        }

        const debit = tokens.times(price).toDecimalPlaces(40, Decimal.ROUND_DOWN);
        if (debit.lte(0) || debit.gt(payBudget)) {
          const err = new Error("internal amount error");
          err.code = "BAD_AMOUNT";
          throw err;
        }

        const payRow = await getBalanceRow(tx, user.id, sale.payAsset);
        if (d(payRow.available).lt(debit)) {
          const err = new Error(`insufficient ${sale.payAsset} available`);
          err.code = "INSUFFICIENT_BALANCE";
          throw err;
        }

        const offRow = await getBalanceRow(tx, user.id, sale.offerAsset);
        await tx.cexBalance.update({
          where: { id: payRow.id },
          data: { available: d(payRow.available).minus(debit).toString() },
        });
        await tx.cexBalance.update({
          where: { id: offRow.id },
          data: { available: d(offRow.available).plus(tokens).toString() },
        });

        await tx.cexLedgerEntry.createMany({
          data: [
            {
              userId: user.id,
              kind: "launchpad_pay",
              asset: sale.payAsset,
              deltaAvail: debit.negated().toString(),
            },
            {
              userId: user.id,
              kind: "launchpad_receive",
              asset: sale.offerAsset,
              deltaAvail: tokens.toString(),
            },
          ],
        });

        const newSold = d(sale.soldTokens).plus(tokens).toString();
        await tx.launchpadSale.update({
          where: { id: sale.id },
          data: { soldTokens: newSold },
        });

        const alloc = await tx.launchpadAllocation.create({
          data: {
            saleId: sale.id,
            userId: user.id,
            payAmount: debit.toString(),
            tokensReceived: tokens.toString(),
          },
        });

        const saleFresh = { ...sale, soldTokens: newSold };
        return {
          allocation: {
            id: alloc.id,
            saleId: sale.id,
            payAmount: debit.toString(),
            tokensReceived: tokens.toString(),
            createdAt: alloc.createdAt.getTime(),
          },
          sale: serializeSaleRow(saleFresh),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 }
    );
    return { ok: true, ...out };
  } catch (e) {
    const code = e.code;
    if (
      code === "NOT_FOUND" ||
      code === "NOT_LIVE" ||
      code === "NOT_IN_WINDOW" ||
      code === "MISCONFIG" ||
      code === "TIER_REQUIRED" ||
      code === "SOLD_OUT" ||
      code === "AMOUNT_TOO_SMALL" ||
      code === "BAD_AMOUNT" ||
      code === "INSUFFICIENT_BALANCE"
    ) {
      return { ok: false, error: e.message || "participate failed", code };
    }
    throw e;
  }
}

async function myAllocations(user) {
  if (!launchpadEnabled()) return { ok: true, enabled: false, allocations: [] };
  if (!user?.id) return { ok: false, error: "not authenticated", code: "UNAUTHENTICATED" };
  const rows = await prisma.launchpadAllocation.findMany({
    where: { userId: user.id },
    include: { sale: { select: { title: true, slug: true, offerAsset: true, payAsset: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return {
    ok: true,
    enabled: true,
    allocations: rows.map((r) => ({
      id: r.id,
      saleId: r.saleId,
      payAmount: r.payAmount,
      tokensReceived: r.tokensReceived,
      createdAt: r.createdAt.toISOString(),
      sale: r.sale,
    })),
  };
}

async function adminListSales() {
  if (!launchpadEnabled()) return { ok: true, enabled: false, sales: [] };
  const rows = await prisma.launchpadSale.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return { ok: true, enabled: true, sales: rows.map(serializeSaleRow) };
}

/**
 * @param {Record<string, unknown>} body
 */
async function adminCreateSale(body) {
  if (!launchpadEnabled()) return { ok: false, error: "launchpad disabled", code: "DISABLED" };
  const slug = String(body.slug || "").trim().toLowerCase();
  const title = String(body.title || "").trim();
  const offerAsset = assetSym(body.offerAsset);
  const payAsset = assetSym(body.payAsset);
  const pricePayPerToken = String(body.pricePayPerToken || "").trim();
  const totalOfferTokens = String(body.totalOfferTokens || "").trim();
  const minTierRank = Math.max(0, Math.min(1000, parseInt(String(body.minTierRank ?? 0), 10) || 0));
  const status = String(body.status || "draft").trim().toLowerCase();
  const summary = body.summary != null ? String(body.summary).trim().slice(0, 8000) : null;

  if (!slugOk(slug)) {
    return { ok: false, error: "slug must be lowercase a-z, 0-9, hyphens", code: "BAD_REQUEST" };
  }
  if (!title) return { ok: false, error: "title is required", code: "BAD_REQUEST" };
  if (!offerAsset || offerAsset.length < 2) return { ok: false, error: "offerAsset is required", code: "BAD_REQUEST" };
  if (payAsset !== String(CEX_QUOTE_ASSET).toUpperCase()) {
    return { ok: false, error: `payAsset must be ${CEX_QUOTE_ASSET}`, code: "BAD_REQUEST" };
  }
  if (d(pricePayPerToken).lte(0)) return { ok: false, error: "pricePayPerToken must be positive", code: "BAD_REQUEST" };
  if (d(totalOfferTokens).lte(0)) return { ok: false, error: "totalOfferTokens must be positive", code: "BAD_REQUEST" };
  if (!["draft", "live", "paused", "ended"].includes(status)) {
    return { ok: false, error: "invalid status", code: "BAD_REQUEST" };
  }

  let startsAt = null;
  let endsAt = null;
  if (body.startsAt) {
    const t = new Date(String(body.startsAt));
    if (!Number.isFinite(t.getTime())) return { ok: false, error: "invalid startsAt", code: "BAD_REQUEST" };
    startsAt = t;
  }
  if (body.endsAt) {
    const t = new Date(String(body.endsAt));
    if (!Number.isFinite(t.getTime())) return { ok: false, error: "invalid endsAt", code: "BAD_REQUEST" };
    endsAt = t;
  }

  try {
    const row = await prisma.launchpadSale.create({
      data: {
        slug,
        title,
        summary,
        offerAsset,
        payAsset,
        pricePayPerToken,
        totalOfferTokens,
        soldTokens: "0",
        minTierRank,
        status,
        startsAt,
        endsAt,
      },
    });
    return { ok: true, sale: serializeSaleRow(row) };
  } catch (e) {
    if (e.code === "P2002") return { ok: false, error: "slug already exists", code: "CONFLICT" };
    throw e;
  }
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 */
async function adminPatchSale(id, body) {
  if (!launchpadEnabled()) return { ok: false, error: "launchpad disabled", code: "DISABLED" };
  const rid = String(id || "").trim();
  if (!rid) return { ok: false, error: "id required", code: "BAD_REQUEST" };

  const data = {};
  if (body.title != null) data.title = String(body.title).trim();
  if (body.summary !== undefined) data.summary = body.summary ? String(body.summary).trim().slice(0, 8000) : null;
  if (body.status != null) {
    const s = String(body.status).trim().toLowerCase();
    if (!["draft", "live", "paused", "ended"].includes(s)) return { ok: false, error: "invalid status", code: "BAD_REQUEST" };
    data.status = s;
  }
  if (body.startsAt !== undefined) {
    data.startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  }
  if (body.endsAt !== undefined) {
    data.endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
  }
  if (body.minTierRank != null) {
    data.minTierRank = Math.max(0, Math.min(1000, parseInt(String(body.minTierRank), 10) || 0));
  }
  if (body.pricePayPerToken != null) {
    if (d(body.pricePayPerToken).lte(0)) return { ok: false, error: "invalid price", code: "BAD_REQUEST" };
    data.pricePayPerToken = String(body.pricePayPerToken).trim();
  }
  if (Object.keys(data).length === 0) return { ok: false, error: "no updates", code: "BAD_REQUEST" };

  try {
    const row = await prisma.launchpadSale.update({ where: { id: rid }, data });
    return { ok: true, sale: serializeSaleRow(row) };
  } catch (e) {
    if (e.code === "P2025") return { ok: false, error: "not found", code: "NOT_FOUND" };
    throw e;
  }
}

module.exports = {
  launchpadEnabled,
  listSalesPublic,
  getSale,
  participate,
  myAllocations,
  adminListSales,
  adminCreateSale,
  adminPatchSale,
};
