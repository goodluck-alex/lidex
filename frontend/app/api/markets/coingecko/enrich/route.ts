import { NextResponse } from "next/server";
import { baseSymbolToCoingeckoId, uniqueCoingeckoIdsForBases } from "../../../../../lib/coingeckoBaseIds";

const CACHE_SECONDS = 60;
const MAX_PAIRS = 80;

type GeckoCoin = {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
};

type PairIn = { symbol: string; base: string; quote: string };

export type EnrichByPairSymbol = Record<
  string,
  {
    price: number;
    change24hPct: number;
    volume24hQuote: number;
  }
>;

function buildCoingeckoUrl(): { url: string; headers: HeadersInit } {
  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  const base = apiKey ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
  const headers: HeadersInit = { Accept: "application/json" };
  if (apiKey) headers["x-cg-pro-api-key"] = apiKey;
  return { url: base, headers };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Invalid JSON" }, { status: 400 });
  }

  const pairs = (body as { pairs?: PairIn }).pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return NextResponse.json({ ok: false as const, error: "pairs[] required" }, { status: 400 });
  }
  if (pairs.length > MAX_PAIRS) {
    return NextResponse.json({ ok: false as const, error: "Too many pairs" }, { status: 400 });
  }

  const sanitized: PairIn[] = [];
  for (const p of pairs) {
    if (!p || typeof p !== "object") continue;
    const symbol = String((p as PairIn).symbol || "").trim();
    const base = String((p as PairIn).base || "").trim();
    const quote = String((p as PairIn).quote || "").trim();
    if (!symbol || !base) continue;
    sanitized.push({ symbol, base, quote });
  }

  const bases = [...new Set(sanitized.map((p) => p.base))];
  const ids = uniqueCoingeckoIdsForBases(bases);
  if (ids.length === 0) {
    return NextResponse.json(
      {
        ok: true as const,
        byPairSymbol: {} as EnrichByPairSymbol,
        updatedAt: Date.now()
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`
        }
      }
    );
  }

  const { url: apiBase, headers } = buildCoingeckoUrl();
  const url = new URL(`${apiBase}/coins/markets`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("per_page", String(Math.min(250, ids.length + 5)));
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const snippet = await res.text();
      return NextResponse.json(
        {
          ok: false as const,
          error: `Market data returned ${res.status}`,
          detail: snippet.slice(0, 200)
        },
        { status: 502 }
      );
    }

    const raw = (await res.json()) as GeckoCoin[];
    if (!Array.isArray(raw)) {
      return NextResponse.json({ ok: false as const, error: "Invalid market data response" }, { status: 502 });
    }

    const byGeckoId = Object.fromEntries(raw.map((c) => [c.id, c]));

    const byPairSymbol: EnrichByPairSymbol = {};
    for (const p of sanitized) {
      const gid = baseSymbolToCoingeckoId(p.base);
      if (!gid) continue;
      const c = byGeckoId[gid];
      if (!c) continue;
      byPairSymbol[p.symbol] = {
        price: c.current_price ?? 0,
        change24hPct: c.price_change_percentage_24h ?? 0,
        volume24hQuote: c.total_volume ?? 0
      };
    }

    return NextResponse.json(
      {
        ok: true as const,
        byPairSymbol,
        updatedAt: Date.now()
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=120`
        }
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Market data fetch failed";
    return NextResponse.json({ ok: false as const, error: message }, { status: 500 });
  }
}
