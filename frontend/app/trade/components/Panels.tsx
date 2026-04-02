"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Pill } from "../../../components/ui";
import { CandlesChart, type Candle } from "../../../components/CandlesChart";
import { apiGet } from "../../../services/api";

/** First Phase-1 active pair; chart uses live Binance spot klines for USDT markets. */
export const DEFAULT_TRADE_CHART_SYMBOL = "ETH/USDT";

type StatsResponse = { ok: true; bySymbol: Record<string, { change24hPct: number; volume24hQuote: number }> };

export function PairHeader({ symbol = DEFAULT_TRADE_CHART_SYMBOL }: { symbol?: string }) {
  const [meta, setMeta] = useState<string>("24h: — • Vol: —");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await apiGet<StatsResponse>("/v1/markets/stats");
        if (cancelled) return;
        const st = s.bySymbol?.[symbol];
        if (!st) return;
        const ch = st.change24hPct >= 0 ? `+${st.change24hPct.toFixed(2)}%` : `${st.change24hPct.toFixed(2)}%`;
        setMeta(`24h: ${ch} • Vol: ${st.volume24hQuote != null ? st.volume24hQuote.toLocaleString() : "—"}`);
      } catch {
        if (!cancelled) setMeta("24h: — • Vol: —");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>{symbol}</div>
        <Pill tone="info">CEX Full</Pill>
        <div style={{ fontSize: 12, opacity: 0.72 }}>{meta}</div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Pill tone="muted">Limit</Pill>
        <Pill tone="muted">Market</Pill>
        <Pill tone="muted">Stop</Pill>
      </div>
    </div>
  );
}

type CandlesResponse = {
  ok: true;
  symbol: string;
  interval: string;
  candles: Candle[];
  updatedAt: number;
  source?: string;
};

export function ChartPanel({ symbol = DEFAULT_TRADE_CHART_SYMBOL }: { symbol?: string }) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr(null);
        const res = await apiGet<CandlesResponse>(
          `/v1/markets/candles?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=120`
        );
        if (cancelled) return;
        setCandles(res.candles || []);
        setSource(res.source ?? null);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Failed to load chart");
        setCandles([]);
        setSource(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const sourceLabel = source === "binance" ? "Binance spot" : source === "synthetic" ? "Demo (no live market)" : null;

  return (
    <Card title="Chart" right={<Pill tone="info">Lightweight Charts</Pill>}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {err
            ? `Error: ${err}`
            : `${symbol} • 1h • ${candles.length} bars${sourceLabel ? ` • ${sourceLabel}` : ""}`}
        </div>
        {candles.length > 0 ? (
          <CandlesChart candles={candles} height={320} />
        ) : err ? (
          <div
            style={{
              height: 320,
              borderRadius: 12,
              border: "1px solid rgba(255,90,90,0.25)",
              background: "rgba(255,90,90,0.06)",
              display: "grid",
              placeItems: "center",
              padding: 16,
              fontSize: 13,
              lineHeight: 1.5,
              textAlign: "center",
              opacity: 0.9
            }}
          >
            Could not load candles. Check that the backend is running and <code>/v1/markets/candles</code> is reachable.
          </div>
        ) : (
          <div
            style={{
              height: 320,
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.18)",
              display: "grid",
              placeItems: "center",
              opacity: 0.75,
              fontSize: 13
            }}
          >
            Loading chart…
          </div>
        )}
      </div>
    </Card>
  );
}

export function OrderbookPanel() {
  return (
    <Card title="Order Book" right={<Pill tone="success">Buy/Sell</Pill>}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ height: 150, borderRadius: 12, border: "1px solid rgba(0,200,150,0.18)", background: "rgba(0,200,150,0.06)" }} />
        <div style={{ height: 150, borderRadius: 12, border: "1px solid rgba(255,90,90,0.18)", background: "rgba(255,90,90,0.05)" }} />
      </div>
    </Card>
  );
}

export function OrderEntryPanel() {
  return (
    <Card title="Buy / Sell Panel" right={<Pill>Limit</Pill>}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>Price</div>
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>Amount</div>
        <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>Total</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Button>Buy</Button>
          <Button variant="danger">Sell</Button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.72 }}>Fees & balance preview (custodial + non-custodial).</div>
      </div>
    </Card>
  );
}

export function OpenOrdersPanel() {
  return (
    <Card title="Open Orders">
      <div style={{ fontSize: 13, opacity: 0.8 }}>No open orders.</div>
    </Card>
  );
}

export function TradeHistoryPanel() {
  return (
    <Card title="Trade History">
      <div style={{ fontSize: 13, opacity: 0.8 }}>No recent trades.</div>
    </Card>
  );
}

