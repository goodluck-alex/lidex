"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, PageShell, Pill } from "../../../components/ui";

type GlobalRow = {
  coinId: string;
  name: string;
  image: string | null;
  baseSymbol: string;
  symbol: string; // e.g. BTC/USD
  price: number;
  change24hPct: number;
  volume24hQuote: number;
  marketCap: number | null;
  marketCapRank: number | null;
};

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000 ? n.toFixed(2) : n >= 10 ? n.toFixed(4) : n.toFixed(6);
}
function fmtChangePct(n: number | null | undefined) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
function fmtVol(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

export default function GlobalMarketsPage() {
  const [items, setItems] = useState<GlobalRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr(null);
        const res = await fetch("/api/markets/coingecko", { method: "GET" });
        const data = (await res.json()) as { ok: true; items: GlobalRow[] } | { ok: false; error?: string };
        if (cancelled) return;
        if (!data.ok) {
          setErr(data.error || "Failed to load global markets");
          setItems([]);
          return;
        }
        setItems(data.items || []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load global markets");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((r) => `${r.baseSymbol} ${r.name}`.toLowerCase().includes(needle));
  }, [items, q]);

  return (
    <PageShell
      title="Global markets"
      subtitle="Reference prices (not Lidex order-book prices). For Lidex tradable pairs, use /markets."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/markets" className="text-sm font-semibold text-[#7aa7ff] underline">
          ← Lidex pairs
        </Link>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search coins…"
          className="min-h-11 w-full max-w-sm rounded-xl border border-white/12 bg-black/25 px-3 text-sm text-white placeholder:text-white/35 focus:border-[#00c896]/45 focus:outline-none focus:ring-1 focus:ring-[#00c896]/35"
        />
      </div>

      <Card title="Top coins (USD)" right={<Pill>{err ? "Error" : "External"}</Pill>} tone={err ? "danger" : "default"}>
        {err ? <div className="text-sm text-red-200/90">{err}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-white/45">
                <th className="px-3 py-2">Coin</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">24h</th>
                <th className="px-3 py-2">Vol 24h</th>
                <th className="px-3 py-2">MCap rank</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const up = (r.change24hPct ?? 0) >= 0;
                return (
                  <tr key={r.coinId} className="border-b border-white/[0.06]">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {r.image ? <img src={r.image} alt="" width={20} height={20} className="rounded-full" /> : null}
                        <div className="min-w-0">
                          <div className="font-semibold text-white">{r.baseSymbol}</div>
                          <div className="text-xs text-white/55">{r.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-white/85">${fmtPrice(r.price)}</td>
                    <td className={`px-3 py-2 tabular-nums font-semibold ${up ? "text-[#00c896]" : "text-red-300"}`}>
                      {fmtChangePct(r.change24hPct)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-white/70">{fmtVol(r.volume24hQuote)}</td>
                    <td className="px-3 py-2 tabular-nums text-white/55">{r.marketCapRank ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}

