"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMode } from "../../context/mode";
import { Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { ResponsivePanels } from "../../components/ResponsivePanels";
import { apiGet } from "../../services/api";
import { CandlesChart, type Candle } from "../../components/CandlesChart";

function Row({ symbol, price, change, volume }: { symbol: string; price: string; change: string; volume: string }) {
  const isUp = change.trim().startsWith("+");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: 13
      }}
    >
      <div style={{ fontWeight: 700 }}>{symbol}</div>
      <div style={{ opacity: 0.9 }}>{price}</div>
      <div style={{ color: isUp ? "#00C896" : "#ff6b6b", fontWeight: 700 }}>{change}</div>
      <div style={{ opacity: 0.75 }}>{volume}</div>
    </div>
  );
}

type Pair = { symbol: string; base: string; quote: string; status: "active" | "coming_soon" };
type PairsResponse = { ok: true; active: Pair[]; comingSoon: Pair[] };
type Stat = { symbol: string; price: number; change24hPct: number; volume24hQuote: number; updatedAt: number };
type StatsResponse = { ok: true; items: Stat[]; bySymbol: Record<string, Stat>; updatedAt: number };
type CandlesResponse = {
  ok: true;
  symbol: string;
  interval: string;
  candles: Candle[];
  updatedAt: number;
  source?: string;
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function PairPicker({
  selected,
  pairs,
  onSelect
}: {
  selected: string;
  pairs: PairsResponse | null;
  onSelect: (symbol: string) => void;
}) {
  const all = [...(pairs?.active || []), ...(pairs?.comingSoon || [])];
  return (
    <select
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
      style={{
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "transparent",
        color: "white",
        width: "100%"
      }}
    >
      {all.map((p) => (
        <option key={p.symbol} value={p.symbol}>
          {p.symbol}
        </option>
      ))}
    </select>
  );
}

export default function MarketsPage() {
  const { mode } = useMode();
  const isCex = mode === "cex";
  const [pairs, setPairs] = useState<PairsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userKey = useMemo(() => "phase1", []);
  const [selected, setSelected] = useState<string>("ETH/USDT");
  const [candles, setCandles] = useState<CandlesResponse | null>(null);
  const [candlesError, setCandlesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const [p, s] = await Promise.all([
          apiGet<PairsResponse>("/v1/markets/pairs"),
          apiGet<StatsResponse>("/v1/markets/stats")
        ]);
        if (cancelled) return;
        setPairs(p);
        setStats(s);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load markets");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  useEffect(() => {
    if (!isCex) {
      setCandles(null);
      setCandlesError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setCandlesError(null);
        const res = await apiGet<CandlesResponse>(`/v1/markets/candles?symbol=${encodeURIComponent(selected)}&interval=1h&limit=120`);
        if (cancelled) return;
        setCandles(res);
      } catch (e) {
        if (cancelled) return;
        setCandlesError(e instanceof Error ? e.message : "Failed to load candles");
        setCandles(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, isCex]);

  const candleData = candles?.candles || [];

  return (
    <PageShell
      title="Markets"
      subtitle={
        isCex
          ? "Full token list + filters + charts (CEX Full)."
          : "Phase 1: Top 5 active pairs + LDX pairs shown as Coming Soon (DEX Lite)."
      }
    >
      {!isCex ? (
        <Grid>
          <Span col={12}>
            <Card
              title="Phase 1 markets"
              right={<Pill>{error ? "Error" : "Live from backend"}</Pill>}
              tone={error ? "danger" : "default"}
            >
              <div style={{ display: "grid" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 10, fontSize: 12, opacity: 0.7, paddingBottom: 8 }}>
                  <div>Pair</div>
                  <div>Price</div>
                  <div>24h</div>
                  <div>Volume</div>
                </div>
                {(pairs?.comingSoon || []).map((p) => (
                  <Row
                    key={p.symbol}
                    symbol={`${p.symbol} (Coming Soon)`}
                    price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                    change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                    volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                  />
                ))}
                {(pairs?.active || []).map((p) => (
                  <Row
                    key={p.symbol}
                    symbol={p.symbol}
                    price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                    change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                    volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                  />
                ))}
                {error ? (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Error: {error}</div>
                ) : null}
              </div>
            </Card>
          </Span>
        </Grid>
      ) : (
        <ResponsivePanels
          tabs={[
            { id: "list", label: "List" },
            { id: "details", label: "Details" },
            { id: "depth", label: "Depth" }
          ] as const}
          renderMobile={(active) => (
            <Grid columns={12} gap={12}>
              <Span col={12}>
                {active === "list" ? (
                  <Card title="Markets" right={<Pill tone="info">{error ? "Error" : "Pairs"}</Pill>} tone={error ? "danger" : "default"}>
                    <div style={{ display: "grid" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 10, fontSize: 12, opacity: 0.7, paddingBottom: 8 }}>
                        <div>Pair</div>
                        <div>Price</div>
                        <div>24h</div>
                        <div>Volume</div>
                      </div>
                      {(pairs?.comingSoon || []).map((p) => (
                        <Row
                          key={p.symbol}
                          symbol={`${p.symbol} (Coming Soon)`}
                          price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                          change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                          volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                        />
                      ))}
                      {(pairs?.active || []).map((p) => (
                        <Row
                          key={p.symbol}
                          symbol={p.symbol}
                          price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                          change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                          volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                        />
                      ))}
                      {error ? (
                        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Error: {error}</div>
                      ) : null}
                    </div>
                  </Card>
                ) : null}

                {active === "details" ? (
                  <Card title="Market details" right={<Pill tone="success">Chart</Pill>}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <PairPicker selected={selected} pairs={pairs} onSelect={setSelected} />
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {candlesError
                          ? `Error: ${candlesError}`
                          : candles
                            ? `Interval: ${candles.interval} • ${candles.candles.length} bars • ${
                                candles.source === "binance" ? "Binance spot" : candles.source === "synthetic" ? "Demo" : "Live"
                              }`
                            : "Loading candles..."}
                      </div>
                      <CandlesChart candles={candleData} height={220} />
                    </div>
                  </Card>
                ) : null}

                {active === "depth" ? (
                  <Card title="Depth" right={<Pill tone="success">Orderbook</Pill>}>
                    <div style={{ height: 260, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)", display: "grid", placeItems: "center", opacity: 0.75 }}>
                      Depth indicator placeholder
                    </div>
                  </Card>
                ) : null}
              </Span>
            </Grid>
          )}
        >
          <Grid>
            <Span col={8}>
              <Card title="Markets" right={<Pill tone="info">{error ? "Error" : "Pairs"}</Pill>} tone={error ? "danger" : "default"}>
                <div style={{ display: "grid" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 10, fontSize: 12, opacity: 0.7, paddingBottom: 8 }}>
                    <div>Pair</div>
                    <div>Price</div>
                    <div>24h</div>
                    <div>Volume</div>
                  </div>
                  {(pairs?.comingSoon || []).map((p) => (
                    <Row
                      key={p.symbol}
                      symbol={`${p.symbol} (Coming Soon)`}
                      price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                      change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                      volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                    />
                  ))}
                  {(pairs?.active || []).map((p) => (
                    <Row
                      key={p.symbol}
                      symbol={p.symbol}
                      price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                      change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                      volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                    />
                  ))}
                  {error ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Error: {error}</div>
                  ) : null}
                </div>
              </Card>
            </Span>

            <Span col={4}>
              <Card title="Market details" right={<Pill tone="success">Depth</Pill>}>
                <div style={{ display: "grid", gap: 10 }}>
                  <PairPicker selected={selected} pairs={pairs} onSelect={setSelected} />
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {candlesError
                      ? `Error: ${candlesError}`
                      : candles
                        ? `Interval: ${candles.interval} • ${
                            candles.source === "binance" ? "Binance spot" : candles.source === "synthetic" ? "Demo" : "Live"
                          }`
                        : "Loading candles..."}
                  </div>
                  <CandlesChart candles={candleData} height={180} />
                  <div style={{ height: 120, borderRadius: 12, border: "1px dashed rgba(255,255,255,0.18)", display: "grid", placeItems: "center", opacity: 0.75 }}>
                    Depth indicator placeholder
                  </div>
                </div>
              </Card>
            </Span>
          </Grid>
        </ResponsivePanels>
      )}
    </PageShell>
  );
}

