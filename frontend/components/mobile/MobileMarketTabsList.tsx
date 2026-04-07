"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import type { MarketOverviewRow } from "../home/HomeLanding";
import type { MarketOverviewTab } from "../../hooks/useMarketOverview";
import { isFavorite, toggleFavorite } from "../../lib/mobile/favorites";

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

export function MobileMarketTabsList({
  loading,
  error,
  sortedForTab,
  topVolumeIds
}: {
  loading: boolean;
  error: string | null;
  sortedForTab: (tab: MarketOverviewTab) => MarketOverviewRow[];
  topVolumeIds: Set<string>;
}) {
  const [tab, setTab] = useState<MarketOverviewTab>("trending");
  const [, bump] = useState(0);
  const rows = useMemo(() => sortedForTab(tab).slice(0, 20), [sortedForTab, tab]);

  if (loading) {
    return (
      <section className="px-3 py-4">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-white/10" />
        <div className="mb-2 flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-white/10" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="px-3 py-4">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      </section>
    );
  }

  return (
    <section className="px-3 py-4">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Market overview</h2>
          <p className="text-[10px] text-white/45">Live snapshot · reference data</p>
        </div>
        <Link href="/markets" className="text-xs font-semibold text-[#7aa7ff]">
          Full markets →
        </Link>
      </div>
      <div className="mb-3 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.id ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/[0.06] text-white/55"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="space-y-1">
        {rows.map((r) => {
          const up = r.change24hPct >= 0;
          const hot = topVolumeIds.has(r.coinId);
          const fav = isFavorite(r.coinId);
          return (
            <li key={r.coinId}>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2 shadow-sm shadow-black/20">
                <button
                  type="button"
                  aria-label={fav ? "Remove favorite" : "Add favorite"}
                  className="shrink-0 p-1 text-lg leading-none text-[#f0b90b]/90"
                  onClick={() => {
                    toggleFavorite(r.coinId);
                    bump((x) => x + 1);
                  }}
                >
                  {fav ? "★" : "☆"}
                </button>
                <Link href={`/markets?q=${encodeURIComponent(r.baseSymbol)}`} className="flex min-w-0 flex-1 items-center gap-2">
                  {r.image ? (
                    <img src={r.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full" />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-bold text-white">
                        {r.baseSymbol}
                        <span className="font-normal text-white/45">/USD</span>
                      </span>
                      {hot ? (
                        <span className="rounded bg-[#00c896]/20 px-1 py-px text-[9px] font-bold uppercase text-[#b8f5e0]">
                          Hot
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-[11px] text-white/45">{r.name}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-white">${fmtPrice(r.price)}</div>
                    <div className={`text-xs font-bold ${up ? "text-[#00c896]" : "text-[#ff6b6b]"}`}>{fmtChangePct(r.change24hPct)}</div>
                  </div>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
