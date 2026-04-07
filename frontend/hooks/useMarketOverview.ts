"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketOverviewRow } from "../components/home/HomeLanding";

export type MarketOverviewTab = "trending" | "gainers" | "losers" | "new";

export function useMarketOverview() {
  const [rows, setRows] = useState<MarketOverviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/markets/coingecko");
      const data = (await res.json()) as
        | { ok: true; items: MarketOverviewRow[] }
        | { ok: false; error?: string };
      if (!data.ok) {
        setRows([]);
        setError(data.error || "Failed to load markets");
        return;
      }
      setRows(data.items);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sortedForTab = useCallback(
    (tab: MarketOverviewTab) => {
      const base = [...rows];
      switch (tab) {
        case "gainers":
          return base.sort((a, b) => b.change24hPct - a.change24hPct);
        case "losers":
          return base.sort((a, b) => a.change24hPct - b.change24hPct);
        case "new":
          return [...base]
            .filter((r) => r.marketCap != null && r.marketCap > 0)
            .sort((a, b) => (a.marketCap ?? 0) - (b.marketCap ?? 0));
        case "trending":
        default:
          return base.sort((a, b) => b.volume24hQuote - a.volume24hQuote);
      }
    },
    [rows]
  );

  const bySymbol = useMemo(() => {
    const m = new Map<string, MarketOverviewRow>();
    for (const r of rows) m.set(r.baseSymbol.toUpperCase(), r);
    return m;
  }, [rows]);

  return { rows, error, loading, refresh, sortedForTab, bySymbol };
}
