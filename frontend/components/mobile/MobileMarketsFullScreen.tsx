"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import type { MarketOverviewTab } from "../../hooks/useMarketOverview";
import { useMarketOverview } from "../../hooks/useMarketOverview";
import { isFavorite, toggleFavorite } from "../../lib/mobile/favorites";
import { MobileStickyHeader } from "./MobileStickyHeader";

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000 ? n.toFixed(2) : n >= 10 ? n.toFixed(4) : n.toFixed(6);
}
function fmtChangePct(n: number | null | undefined) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

const TABS: { id: MarketOverviewTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "gainers", label: "Gainers" },
  { id: "losers", label: "Losers" },
  { id: "new", label: "New" }
];

export function MobileMarketsFullScreen() {
  const { rows, error, loading, sortedForTab } = useMarketOverview();
  const [tab, setTab] = useState<MarketOverviewTab>("trending");
  const [, bump] = useState(0);
  const list = useMemo(() => sortedForTab(tab), [sortedForTab, tab]);

  return (
    <div className="min-h-dvh text-white">
      <MobileStickyHeader marketRows={rows} />
      <div className="border-b border-white/[0.06] px-3 py-3">
        <h1 className="text-lg font-bold">Markets</h1>
        <p className="text-xs text-white/50">All pairs · reference snapshot</p>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === t.id ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/[0.06] text-white/55"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      ) : error ? (
        <p className="p-4 text-sm text-red-200">{error}</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] px-2 py-2">
          {list.map((r) => {
            const up = r.change24hPct >= 0;
            const fav = isFavorite(r.coinId);
            return (
              <li key={r.coinId} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  className="p-1 text-[#f0b90b]/90"
                  onClick={() => {
                    toggleFavorite(r.coinId);
                    bump((x) => x + 1);
                  }}
                  aria-label="Favorite"
                >
                  {fav ? "★" : "☆"}
                </button>
                <Link href={`/markets?q=${encodeURIComponent(r.baseSymbol)}`} className="flex min-w-0 flex-1 items-center gap-2">
                  {r.image ? (
                    <img src={r.image} alt="" width={40} height={40} className="h-10 w-10 rounded-full" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {r.baseSymbol}
                      <span className="text-white/45">/USD</span>
                    </div>
                    <div className="text-[11px] text-white/45">Vol {r.volume24hQuote >= 1e6 ? `${(r.volume24hQuote / 1e6).toFixed(2)}M` : `${(r.volume24hQuote / 1e3).toFixed(1)}K`}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${fmtPrice(r.price)}</div>
                    <div className={`text-xs font-bold ${up ? "text-[#00c896]" : "text-[#ff6b6b]"}`}>{fmtChangePct(r.change24hPct)}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
