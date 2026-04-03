const { prisma } = require("../../lib/prisma");

function normalizeSymbol(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s || !s.includes("/")) {
    return { ok: false, error: "symbol must look like BASE/QUOTE (e.g. LDX/USDT)", code: "BAD_REQUEST" };
  }
  return { ok: true, symbol: s };
}

function serialize(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    active: row.active,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function listActivations() {
  const rows = await prisma.dexPairActivation.findMany({
    orderBy: [{ symbol: "asc" }],
  });
  return { ok: true, activations: rows.map(serialize) };
}

/**
 * @param {{ symbol: string; active?: boolean; note?: string | null }} body
 */
async function upsertActivation(body) {
  const n = normalizeSymbol(body?.symbol);
  if (!n.ok) return { ok: false, error: n.error, code: n.code };
  const active = body?.active !== false;
  const noteRaw = body?.note;
  const note =
    noteRaw === undefined || noteRaw === null
      ? undefined
      : String(noteRaw).trim().slice(0, 4000) || null;

  const row = await prisma.dexPairActivation.upsert({
    where: { symbol: n.symbol },
    create: {
      symbol: n.symbol,
      active,
      note: note === undefined ? null : note,
    },
    update: {
      active,
      ...(note !== undefined ? { note } : {}),
    },
  });
  return { ok: true, activation: serialize(row) };
}

async function deleteActivation(rawSymbol) {
  const n = normalizeSymbol(rawSymbol);
  if (!n.ok) return { ok: false, error: n.error, code: n.code };
  try {
    await prisma.dexPairActivation.delete({ where: { symbol: n.symbol } });
  } catch {
    // not found — idempotent for ops
  }
  return { ok: true };
}

module.exports = { listActivations, upsertActivation, deleteActivation, normalizeSymbol };
