import { NextResponse } from "next/server";

/** CoinGecko `/coins/markets` row (subset). */
type GeckoCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
};

const CACHE_SECONDS = 60;

/**
 * Proxies CoinGecko market data (server-side) to avoid browser CORS and optional Pro API key.
 * @see https://www.coingecko.com/en/api/documentation
 */
export async function GET() {
  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  const base = apiKey ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
  const url = new URL(`${base}/coins/markets`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("price_change_percentage", "24h");

  const headers: HeadersInit = { Accept: "application/json" };
  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const snippet = await res.text();
      return NextResponse.json(
        {
          ok: false as const,
          error: `Market data returned ${res.status}`,
          detail: snippet.slice(0, 300)
        },
        { status: 502 }
      );
    }

    const raw = (await res.json()) as GeckoCoin[];
    if (!Array.isArray(raw)) {
      return NextResponse.json({ ok: false as const, error: "Invalid market data response" }, { status: 502 });
    }

    const items = raw.map((c) => {
      const sym = String(c.symbol || "").toUpperCase();
      return {
        coinId: c.id,
        name: c.name,
        image: c.image || null,
        baseSymbol: sym,
        symbol: `${sym}/USD`,
        price: c.current_price ?? 0,
        change24hPct: c.price_change_percentage_24h ?? 0,
        volume24hQuote: c.total_volume ?? 0,
        marketCap: c.market_cap ?? null,
        marketCapRank: c.market_cap_rank ?? null
      };
    });

    return NextResponse.json(
      {
        ok: true as const,
        items,
        source: "external_index" as const,
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
