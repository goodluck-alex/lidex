"use client";

import type { CSSProperties } from "react";
import React, { useEffect, useMemo, useState } from "react";
import { useMode } from "../../context/mode";
import { Card, Grid, PageShell, Pill, Span } from "../../components/ui";
import { ResponsivePanels } from "../../components/ResponsivePanels";
import { apiGet } from "../../services/api";
import { CandlesChart, type Candle } from "../../components/CandlesChart";
import { chainName } from "../../utils/chains";

type MarketTokenMeta = { symbol: string; name: string; logoUrl: string | null };

const LDX_PAIR_META: MarketTokenMeta = { symbol: "LDX", name: "Lidex", logoUrl: "/lidex-logo.png" };

function MiniAvatar({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          flexShrink: 0
        }}
      />
    );
  }
  return (
    <img src={url} alt="" width={22} height={22} style={{ borderRadius: 999, objectFit: "cover", flexShrink: 0 }} />
  );
}

function Row({
  title,
  baseToken,
  quoteToken,
  price,
  change,
  volume
}: {
  title: string;
  baseToken?: MarketTokenMeta | null;
  quoteToken?: MarketTokenMeta | null;
  price: string;
  change: string;
  volume: string;
}) {
  const isUp = change.trim().startsWith("+");
  const subtitle = baseToken && quoteToken ? `${baseToken.name} · ${quoteToken.name}` : null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(168px, 1.5fr) 1fr 1fr 1fr",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: 13,
        alignItems: "center"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <MiniAvatar url={baseToken?.logoUrl ?? null} />
          <MiniAvatar url={quoteToken?.logoUrl ?? null} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          {subtitle ? (
            <div
              style={{
                fontSize: 11,
                opacity: 0.62,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ opacity: 0.9 }}>{price}</div>
      <div style={{ color: isUp ? "#00C896" : "#ff6b6b", fontWeight: 700 }}>{change}</div>
      <div style={{ opacity: 0.75 }}>{volume}</div>
    </div>
  );
}

const rowHeadGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(168px, 1.5fr) 1fr 1fr 1fr",
  gap: 10,
  fontSize: 12,
  opacity: 0.7,
  paddingBottom: 8
};

type Pair = {
  symbol: string;
  base: string;
  quote: string;
  status: "active" | "coming_soon";
  baseToken?: MarketTokenMeta;
  quoteToken?: MarketTokenMeta;
};
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
  const [listingsChainId, setListingsChainId] = useState<number>(56);
  const [listedTokens, setListedTokens] = useState<
    { symbol: string; address: string; decimals: number; featured: boolean; name?: string; logoUrl?: string | null }[] | null
  >(null);
  const [listedTokensErr, setListedTokensErr] = useState<string | null>(null);
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
    let cancelled = false;
    (async () => {
      try {
        setListedTokensErr(null);
        const res = await apiGet<{
          ok: true;
          chainId: number;
          tokens: {
            symbol: string;
            address: string;
            decimals: number;
            featured: boolean;
            name?: string;
            logoUrl?: string | null;
          }[];
        }>(`/v1/tokens/list?chainId=${Number(listingsChainId)}`);
        if (cancelled) return;
        setListedTokens(res.tokens || []);
      } catch (e) {
        if (cancelled) return;
        setListedTokens(null);
        setListedTokensErr(e instanceof Error ? e.message : "Failed to load listed tokens");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingsChainId]);

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
                <div style={rowHeadGrid}>
                  <div>Pair</div>
                  <div>Price</div>
                  <div>24h</div>
                  <div>Volume</div>
                </div>
                {(pairs?.comingSoon || []).map((p) => (
                  <Row
                    key={p.symbol}
                    title={`${p.symbol} (Coming Soon)`}
                    baseToken={p.baseToken}
                    quoteToken={p.quoteToken}
                    price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                    change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                    volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                  />
                ))}
                {(pairs?.active || []).map((p) => (
                  <Row
                    key={p.symbol}
                    title={p.symbol}
                    baseToken={p.baseToken}
                    quoteToken={p.quoteToken}
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

          <Span col={12}>
            <Card title="TOKEN/LDX listings (Coming Soon)" right={<Pill tone="info">Phase 7</Pill>}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.55 }}>
                  Approved project tokens are shown here as <b>TOKEN/LDX</b> markets per chain. Liquidity is per-chain (Phase 6 Option A).
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Chain</div>
                  <select
                    value={String(listingsChainId)}
                    onChange={(e) => setListingsChainId(Number(e.target.value))}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "transparent",
                      color: "white",
                      width: "100%",
                    }}
                  >
                    <option value="56">BNB Chain (56)</option>
                    <option value="1">Ethereum (1)</option>
                    <option value="137">Polygon (137)</option>
                    <option value="42161">Arbitrum (42161)</option>
                    <option value="43114">Avalanche (43114)</option>
                  </select>
                </div>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Showing: <b>{chainName(listingsChainId)}</b>
                </div>

                {listedTokensErr ? <div style={{ fontSize: 12, opacity: 0.8 }}>Error: {listedTokensErr}</div> : null}
                {!listedTokens ? (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Loading…</div>
                ) : listedTokens.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>No approved tokens yet for this chain.</div>
                ) : (
                  <div style={{ display: "grid" }}>
                    <div style={rowHeadGrid}>
                      <div>Pair</div>
                      <div>Price</div>
                      <div>24h</div>
                      <div>Volume</div>
                    </div>
                    {listedTokens.map((t) => (
                      <Row
                        key={`${t.symbol}-${t.address}`}
                        title={`${t.symbol}/LDX (Coming Soon)`}
                        baseToken={{
                          symbol: t.symbol,
                          name: t.name || t.symbol,
                          logoUrl: t.logoUrl ?? null
                        }}
                        quoteToken={LDX_PAIR_META}
                        price="—"
                        change="—"
                        volume="—"
                      />
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Want to list? Submit at <b>/listings/apply</b>. Pairing with <b>LDX</b> qualifies for free listing incentives.
                </div>
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
                      <div style={rowHeadGrid}>
                        <div>Pair</div>
                        <div>Price</div>
                        <div>24h</div>
                        <div>Volume</div>
                      </div>
                      {(pairs?.comingSoon || []).map((p) => (
                        <Row
                          key={p.symbol}
                          title={`${p.symbol} (Coming Soon)`}
                          baseToken={p.baseToken}
                          quoteToken={p.quoteToken}
                          price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                          change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                          volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                        />
                      ))}
                      {(pairs?.active || []).map((p) => (
                        <Row
                          key={p.symbol}
                          title={p.symbol}
                          baseToken={p.baseToken}
                          quoteToken={p.quoteToken}
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
                                candles.source === "binance" ? "Lidex" : candles.source === "synthetic" ? "Demo" : "Live"
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
                  <div style={rowHeadGrid}>
                    <div>Pair</div>
                    <div>Price</div>
                    <div>24h</div>
                    <div>Volume</div>
                  </div>
                  {(pairs?.comingSoon || []).map((p) => (
                    <Row
                      key={p.symbol}
                      title={`${p.symbol} (Coming Soon)`}
                      baseToken={p.baseToken}
                      quoteToken={p.quoteToken}
                      price={fmtPrice(stats?.bySymbol?.[p.symbol]?.price)}
                      change={fmtChangePct(stats?.bySymbol?.[p.symbol]?.change24hPct)}
                      volume={fmtVol(stats?.bySymbol?.[p.symbol]?.volume24hQuote)}
                    />
                  ))}
                  {(pairs?.active || []).map((p) => (
                    <Row
                      key={p.symbol}
                      title={p.symbol}
                      baseToken={p.baseToken}
                      quoteToken={p.quoteToken}
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
                            candles.source === "binance" ? "Lidex" : candles.source === "synthetic" ? "Demo" : "Live"
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

