"use client";

import type { CSSProperties } from "react";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

function pairMatchesQuery(p: Pair, q: string) {
  if (!q) return true;
  const blob = [p.symbol, p.base, p.quote, p.baseToken?.name, p.baseToken?.symbol, p.quoteToken?.name, p.quoteToken?.symbol]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return blob.includes(q);
}

function listedTokenMatches(
  t: { symbol: string; address: string; decimals: number; featured: boolean; name?: string; logoUrl?: string | null },
  q: string
) {
  if (!q) return true;
  return `${t.symbol} ${t.name || ""} ${t.address}`.toLowerCase().includes(q);
}

function MarketsSearchField({
  value,
  onChange,
  onApply,
  onClear,
  hasFilter
}: {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
  hasFilter: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
      className="mb-4 flex flex-wrap items-center gap-2.5"
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search pairs by symbol or name…"
        aria-label="Filter markets"
        className="min-h-11 min-w-[200px] flex-1 rounded-xl border border-white/12 bg-black/25 px-3 text-sm text-white placeholder:text-white/35 focus:border-[#00c896]/45 focus:outline-none focus:ring-1 focus:ring-[#00c896]/35"
      />
      <button
        type="submit"
        className="min-h-11 shrink-0 rounded-xl border border-emerald-950/30 bg-[#00c896] px-4 text-sm font-bold text-[#04120c] transition-opacity hover:opacity-90"
      >
        Search
      </button>
      {hasFilter ? (
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 shrink-0 rounded-xl border border-white/15 bg-transparent px-4 text-sm font-semibold text-white/90 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
type PairsResponse = { ok: true; active: Pair[]; comingSoon: Pair[] };
type Stat = { symbol: string; price: number; change24hPct: number; volume24hQuote: number; updatedAt: number };
type StatsResponse = { ok: true; items: Stat[]; bySymbol: Record<string, Stat>; updatedAt: number };

/** POST `/api/markets/coingecko/enrich` — reference USD snapshot per listed pair symbol. */
type RefEnrichRow = { price: number; change24hPct: number; volume24hQuote: number };
type RefEnrichResponse = { ok: true; byPairSymbol: Record<string, RefEnrichRow>; updatedAt: number };

function mergePairStats(
  symbol: string,
  backend: StatsResponse | null,
  refMap: Record<string, RefEnrichRow> | null | undefined
): { price: number | undefined; change24hPct: number | undefined; volume24hQuote: number | undefined } {
  const r = refMap?.[symbol];
  if (r) return { price: r.price, change24hPct: r.change24hPct, volume24hQuote: r.volume24hQuote };
  const b = backend?.bySymbol?.[symbol];
  if (b) return { price: b.price, change24hPct: b.change24hPct, volume24hQuote: b.volume24hQuote };
  return { price: undefined, change24hPct: undefined, volume24hQuote: undefined };
}
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

function MarketsEnrichErrorBanner({ err }: { err: string | null }) {
  if (!err) return null;
  return (
    <div
      style={{
        fontSize: 11,
        opacity: 0.62,
        lineHeight: 1.45,
        marginBottom: 10,
        maxWidth: 780
      }}
    >
      Reference feed unavailable ({err}) — demo figures from Lidex are shown where no snapshot exists.
    </div>
  );
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

function MarketsPageContent() {
  const { mode } = useMode();
  const isCex = mode === "cex";
  const router = useRouter();
  const searchParams = useSearchParams();
  const qRaw = searchParams?.get("q")?.trim() ?? "";
  const q = qRaw.toLowerCase();
  const [searchDraft, setSearchDraft] = useState(qRaw);
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
  const [refEnrichMap, setRefEnrichMap] = useState<Record<string, RefEnrichRow> | null>(null);
  const [refEnrichErr, setRefEnrichErr] = useState<string | null>(null);

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
    if (!pairs) {
      setRefEnrichMap(null);
      setRefEnrichErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setRefEnrichErr(null);
        const list = [...(pairs.active || []), ...(pairs.comingSoon || [])];
        if (list.length === 0) {
          setRefEnrichMap({});
          return;
        }
        const res = await fetch("/api/markets/coingecko/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pairs: list.map((p) => ({ symbol: p.symbol, base: p.base, quote: p.quote }))
          })
        });
        const data = (await res.json()) as RefEnrichResponse | { ok: false; error?: string };
        if (cancelled) return;
        if (!data.ok) {
          setRefEnrichMap(null);
          setRefEnrichErr(data.error || "Reference data unavailable");
          return;
        }
        setRefEnrichMap(data.byPairSymbol);
      } catch (e) {
        if (cancelled) return;
        setRefEnrichMap(null);
        setRefEnrichErr(e instanceof Error ? e.message : "Reference data failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pairs]);

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
    setSearchDraft(qRaw);
  }, [qRaw]);

  const filteredComingSoon = useMemo(
    () => (pairs?.comingSoon || []).filter((p) => pairMatchesQuery(p, q)),
    [pairs, q]
  );
  const filteredActive = useMemo(() => (pairs?.active || []).filter((p) => pairMatchesQuery(p, q)), [pairs, q]);

  const filteredListedTokens = useMemo(() => {
    if (!listedTokens) return null;
    if (!q) return listedTokens;
    return listedTokens.filter((t) => listedTokenMatches(t, q));
  }, [listedTokens, q]);

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
      subtitle={isCex ? "Browse pairs, charts, and filters." : "Browse listed pairs and token applications."}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/markets/global" className="text-sm font-semibold text-[#7aa7ff] underline">
          View global markets (CoinGecko) →
        </Link>
      </div>
      <MarketsSearchField
        value={searchDraft}
        onChange={setSearchDraft}
        onApply={() => {
          const t = searchDraft.trim();
          router.push(t ? `/markets?q=${encodeURIComponent(t)}` : "/markets");
        }}
        onClear={() => {
          setSearchDraft("");
          router.push("/markets");
        }}
        hasFilter={!!qRaw}
      />
      {!isCex ? (
        <Grid>
          <Span col={12}>
            <Card
              title="Markets"
              right={<Pill>{error ? "Error" : "Lidex pairs"}</Pill>}
              tone={error ? "danger" : "default"}
            >
              <div style={{ display: "grid" }}>
                {filteredComingSoon.length === 0 && filteredActive.length === 0 && q ? (
                  <div style={{ padding: "14px 0", fontSize: 13, opacity: 0.75 }}>
                    No pairs match &ldquo;{qRaw}&rdquo;. Try another symbol or{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDraft("");
                        router.push("/markets");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2979ff",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                        font: "inherit"
                      }}
                    >
                      clear the filter
                    </button>
                    .
                  </div>
                ) : (
                  <>
                    <MarketsEnrichErrorBanner err={refEnrichErr} />
                    <div style={rowHeadGrid}>
                      <div>Pair</div>
                      <div>Price (USD · ref.)</div>
                      <div>24h (ref.)</div>
                      <div>Vol 24h (ref.)</div>
                    </div>
                    {filteredComingSoon.map((p) => {
                      const row = mergePairStats(p.symbol, stats, refEnrichMap);
                      return (
                        <Row
                          key={p.symbol}
                          title={`${p.symbol} (Coming Soon)`}
                          baseToken={p.baseToken}
                          quoteToken={p.quoteToken}
                          price={fmtPrice(row.price)}
                          change={fmtChangePct(row.change24hPct)}
                          volume={fmtVol(row.volume24hQuote)}
                        />
                      );
                    })}
                    {filteredActive.map((p) => {
                      const row = mergePairStats(p.symbol, stats, refEnrichMap);
                      return (
                        <Row
                          key={p.symbol}
                          title={p.symbol}
                          baseToken={p.baseToken}
                          quoteToken={p.quoteToken}
                          price={fmtPrice(row.price)}
                          change={fmtChangePct(row.change24hPct)}
                          volume={fmtVol(row.volume24hQuote)}
                        />
                      );
                    })}
                  </>
                )}
                {error ? (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Error: {error}</div>
                ) : null}
              </div>
            </Card>
          </Span>

          <Span col={12}>
            <Card title="TOKEN/LDX listings" right={<Pill tone="info">Coming soon</Pill>}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.55 }}>
                  Approved tokens can appear here as <b>TOKEN/LDX</b> per chain once liquidity and routing are live.
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
                ) : filteredListedTokens && filteredListedTokens.length === 0 && q ? (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>No listed tokens match &ldquo;{qRaw}&rdquo;.</div>
                ) : (
                  <div style={{ display: "grid" }}>
                    <div style={rowHeadGrid}>
                      <div>Pair</div>
                      <div>Price</div>
                      <div>24h</div>
                      <div>Volume</div>
                    </div>
                    {(filteredListedTokens || []).map((t) => (
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
                  Want your token listed?{" "}
                  <Link href="/listings/apply" style={{ color: "#2979ff", textDecoration: "underline" }}>
                    Submit a listing application
                  </Link>
                  . Pairing with <b>LDX</b> may qualify for incentives.
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
                      {filteredComingSoon.length === 0 && filteredActive.length === 0 && q ? (
                        <div style={{ padding: "14px 0", fontSize: 13, opacity: 0.75 }}>No pairs match &ldquo;{qRaw}&rdquo;.</div>
                      ) : (
                        <>
                          <MarketsEnrichErrorBanner err={refEnrichErr} />
                          <div style={rowHeadGrid}>
                            <div>Pair</div>
                            <div>Price (USD · ref.)</div>
                            <div>24h (ref.)</div>
                            <div>Vol 24h (ref.)</div>
                          </div>
                          {filteredComingSoon.map((p) => {
                            const row = mergePairStats(p.symbol, stats, refEnrichMap);
                            return (
                              <Row
                                key={p.symbol}
                                title={`${p.symbol} (Coming Soon)`}
                                baseToken={p.baseToken}
                                quoteToken={p.quoteToken}
                                price={fmtPrice(row.price)}
                                change={fmtChangePct(row.change24hPct)}
                                volume={fmtVol(row.volume24hQuote)}
                              />
                            );
                          })}
                          {filteredActive.map((p) => {
                            const row = mergePairStats(p.symbol, stats, refEnrichMap);
                            return (
                              <Row
                                key={p.symbol}
                                title={p.symbol}
                                baseToken={p.baseToken}
                                quoteToken={p.quoteToken}
                                price={fmtPrice(row.price)}
                                change={fmtChangePct(row.change24hPct)}
                                volume={fmtVol(row.volume24hQuote)}
                              />
                            );
                          })}
                        </>
                      )}
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
                  {filteredComingSoon.length === 0 && filteredActive.length === 0 && q ? (
                    <div style={{ padding: "14px 0", fontSize: 13, opacity: 0.75 }}>No pairs match &ldquo;{qRaw}&rdquo;.</div>
                  ) : (
                    <>
                      <MarketsEnrichErrorBanner err={refEnrichErr} />
                      <div style={rowHeadGrid}>
                        <div>Pair</div>
                        <div>Price (USD · ref.)</div>
                        <div>24h (ref.)</div>
                        <div>Vol 24h (ref.)</div>
                      </div>
                      {filteredComingSoon.map((p) => {
                        const row = mergePairStats(p.symbol, stats, refEnrichMap);
                        return (
                          <Row
                            key={p.symbol}
                            title={`${p.symbol} (Coming Soon)`}
                            baseToken={p.baseToken}
                            quoteToken={p.quoteToken}
                            price={fmtPrice(row.price)}
                            change={fmtChangePct(row.change24hPct)}
                            volume={fmtVol(row.volume24hQuote)}
                          />
                        );
                      })}
                      {filteredActive.map((p) => {
                        const row = mergePairStats(p.symbol, stats, refEnrichMap);
                        return (
                          <Row
                            key={p.symbol}
                            title={p.symbol}
                            baseToken={p.baseToken}
                            quoteToken={p.quoteToken}
                            price={fmtPrice(row.price)}
                            change={fmtChangePct(row.change24hPct)}
                            volume={fmtVol(row.volume24hQuote)}
                          />
                        );
                      })}
                    </>
                  )}
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

export default function MarketsPage() {
  return (
    <Suspense
      fallback={
        <PageShell title="Markets" subtitle="Loading…">
          <div style={{ fontSize: 14, opacity: 0.75 }}>Loading markets…</div>
        </PageShell>
      }
    >
      <MarketsPageContent />
    </Suspense>
  );
}
