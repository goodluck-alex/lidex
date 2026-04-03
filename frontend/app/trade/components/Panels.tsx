"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Pill } from "../../../components/ui";
import { CandlesChart, type Candle } from "../../../components/CandlesChart";
import { apiDelete, apiGet, apiPost, backendBaseUrl, browserLidexMode, lidexModeHeaders } from "../../../services/api";
import { useWallet } from "../../../wallet/useWallet";
import { useTradeUi, useTradeUiOptional } from "./TradeUiContext";

/** First Phase-1 active pair; chart uses live reference klines (USDT markets) until Lidex lists pairs. */
export const DEFAULT_TRADE_CHART_SYMBOL = "ETH/USDT";

type StatsResponse = { ok: true; bySymbol: Record<string, { change24hPct: number; volume24hQuote: number }> };

type CexOrderbook = {
  ok: true;
  symbol: string;
  bids: { price: string; quantity: string }[];
  asks: { price: string; quantity: string }[];
};

type CexStats = {
  ok: true;
  symbol: string;
  baseAsset?: string;
  quoteAsset?: string;
  bestBid: string | null;
  bestAsk: string | null;
  spread: string | null;
  spreadPct: string | null;
  lastTrade: { price: string; quantity: string; createdAt: number } | null;
  internal24h?: {
    tradeCount: number;
    volumeQuote: string;
    volumeBase: string;
    high: string | null;
    low: string | null;
    firstPrice?: string | null;
    lastPrice?: string | null;
    change24hPct?: string | null;
    windowStartMs: number;
  };
};

type TradesResponse = {
  ok: true;
  scope?: "market" | "mine";
  trades: {
    id: string;
    price: string;
    quantity: string;
    createdAt: string;
    makerUserId: string;
    takerUserId: string;
  }[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

type CexStreamMsg =
  | {
      ok: true;
      orderbook: CexOrderbook;
      stats: CexStats;
      trades?: TradesResponse["trades"];
      tradesNextCursor?: string | null;
      tradesHasMore?: boolean;
    }
  | { ok: false; error?: string };

export function PairHeader({ symbol = DEFAULT_TRADE_CHART_SYMBOL }: { symbol?: string }) {
  const [meta, setMeta] = useState<string>("24h: — • Vol: —");
  const [matcherLine, setMatcherLine] = useState<string | null>(null);
  const [matcherReady, setMatcherReady] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      apiGet<CexStats>("/v1/cex/stats")
        .then((s) => {
          if (cancelled) return;
          const last = s.lastTrade?.price ?? "—";
          const ch = s.internal24h?.change24hPct;
          const n = ch != null ? Number(ch) : NaN;
          const chStr = Number.isFinite(n) ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : null;
          const vol =
            s.internal24h && s.internal24h.tradeCount > 0
              ? `${s.internal24h.tradeCount} fills · ${s.internal24h.volumeQuote} ${s.quoteAsset ?? ""}`
              : "no fills (24h)";
          setMatcherLine(`${s.symbol} · last ${last}${chStr ? ` · 24h ${chStr}` : ""} · ${vol}`);
          setMatcherReady(true);
        })
        .catch(() => {
          if (!cancelled) {
            setMatcherLine(null);
            setMatcherReady(true);
          }
        });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>{symbol}</div>
          <Pill tone="info">CEX Full</Pill>
          <div style={{ fontSize: 12, opacity: 0.72 }}>{meta}</div>
        </div>
        {!matcherReady ? (
          <div style={{ fontSize: 11, opacity: 0.5 }}>Loading matcher…</div>
        ) : matcherLine ? (
          <div style={{ fontSize: 11, opacity: 0.68, lineHeight: 1.4 }}>
            <b>Matcher</b> · {matcherLine}
          </div>
        ) : (
          <div style={{ fontSize: 11, opacity: 0.55 }}>Matcher stats unavailable (use CEX mode / check backend).</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Pill tone="success">Limit</Pill>
        <Pill tone="success">Market</Pill>
        <Pill tone="success">Stop-limit</Pill>
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

  const sourceLabel = source === "binance" ? "Lidex" : source === "synthetic" ? "Demo (no live market)" : null;

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
  const tradeUi = useTradeUiOptional();
  const [book, setBook] = useState<CexOrderbook | null>(null);
  const [stats, setStats] = useState<CexStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sseLive, setSseLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let pollBook: ReturnType<typeof setInterval> | null = null;
    let pollStats: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (pollBook) clearInterval(pollBook);
      if (pollStats) clearInterval(pollStats);
      pollBook = null;
      pollStats = null;
    };

    const startPoll = () => {
      if (pollBook != null) return;
      setSseLive(false);
      const loadBook = () =>
        apiGet<CexOrderbook>("/v1/cex/orderbook")
          .then((r) => {
            if (!cancelled) {
              setBook(r);
              setErr(null);
            }
          })
          .catch((e) => {
            if (!cancelled) {
              setBook(null);
              setErr(e instanceof Error ? e.message : "Orderbook failed");
            }
          });
      const loadStats = () =>
        apiGet<CexStats>("/v1/cex/stats").then((r) => {
          if (!cancelled) setStats(r);
        });
      loadBook();
      loadStats();
      pollBook = setInterval(loadBook, 2500);
      pollStats = setInterval(loadStats, 4000);
    };

    if (browserLidexMode() !== "cex") {
      startPoll();
      return () => {
        cancelled = true;
        clearPoll();
      };
    }

    const url = `${backendBaseUrl()}/v1/cex/stream?lidex_mode=cex`;
    es = new EventSource(url, { withCredentials: true });

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as CexStreamMsg;
        if (cancelled) return;
        if (msg.ok && "orderbook" in msg && "stats" in msg) {
          setBook(msg.orderbook);
          setStats(msg.stats);
          setErr(null);
          setSseLive(true);
        } else if (!msg.ok) {
          setErr(msg.error || "Stream error");
        }
      } catch {
        if (!cancelled) setErr("Invalid stream data");
      }
    };

    es.onerror = () => {
      if (cancelled) return;
      es?.close();
      es = null;
      startPoll();
    };

    return () => {
      cancelled = true;
      es?.close();
      clearPoll();
    };
  }, []);

  const sym = book?.symbol ?? "—";

  function levels(rows: { price: string; quantity: string }[], tone: "bid" | "ask") {
    const border = tone === "bid" ? "rgba(0,200,150,0.22)" : "rgba(255,90,90,0.22)";
    const bg = tone === "bid" ? "rgba(0,200,150,0.06)" : "rgba(255,90,90,0.05)";
    return (
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${border}`,
          background: bg,
          padding: 10,
          minHeight: 140,
          maxHeight: 200,
          overflow: "auto",
          fontSize: 12,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {rows.length === 0 ? (
          <div style={{ opacity: 0.65 }}>No {tone === "bid" ? "bids" : "asks"}</div>
        ) : (
          rows.map((r) => (
            <div
              key={`${tone}-${r.price}-${r.quantity}`}
              role={tradeUi ? "button" : undefined}
              title={tradeUi ? "Use price as limit" : undefined}
              onClick={() => tradeUi?.setLimitPrice(r.price)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 4,
                cursor: tradeUi ? "pointer" : "default",
                borderRadius: 6,
                padding: "2px 4px",
                marginLeft: -4,
                marginRight: -4,
              }}
            >
              <span>{r.price}</span>
              <span style={{ opacity: 0.85 }}>{r.quantity}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <Card
      title={`Order book (${sym})`}
      right={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill tone="success">Internal</Pill>
          <Pill tone={sseLive ? "info" : "muted"}>{sseLive ? "Live" : "Polling"}</Pill>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 10 }}>
        {tradeUi ? (
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Click depth rows, best bid/ask, or last trade to set the limit price in the order panel.
          </div>
        ) : null}
        {err ? (
          <div style={{ fontSize: 12, color: "#ff8a8a" }}>{err}</div>
        ) : (
          <div style={{ fontSize: 11, opacity: 0.78, lineHeight: 1.45 }}>
            <div>
              Best bid{" "}
              {tradeUi && stats?.bestBid ? (
                <button
                  type="button"
                  title="Use as limit price"
                  onClick={() => tradeUi.setLimitPrice(stats.bestBid!)}
                  style={{
                    background: "rgba(0,200,150,0.15)",
                    border: "1px solid rgba(0,200,150,0.35)",
                    color: "inherit",
                    borderRadius: 6,
                    padding: "1px 6px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {stats.bestBid}
                </button>
              ) : (
                <b>{stats?.bestBid ?? "—"}</b>
              )}{" "}
              · Best ask{" "}
              {tradeUi && stats?.bestAsk ? (
                <button
                  type="button"
                  title="Use as limit price"
                  onClick={() => tradeUi.setLimitPrice(stats.bestAsk!)}
                  style={{
                    background: "rgba(255,90,90,0.12)",
                    border: "1px solid rgba(255,90,90,0.35)",
                    color: "inherit",
                    borderRadius: 6,
                    padding: "1px 6px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {stats.bestAsk}
                </button>
              ) : (
                <b>{stats?.bestAsk ?? "—"}</b>
              )}
              {stats?.spread != null ? (
                <>
                  {" "}
                  · Spread <b>{stats.spread}</b>
                  {stats.spreadPct != null ? ` (${stats.spreadPct}%)` : ""}
                </>
              ) : null}
            </div>
            {stats?.lastTrade ? (
              <div style={{ marginTop: 4, opacity: 0.85 }}>
                Last:{" "}
                {tradeUi ? (
                  <button
                    type="button"
                    title="Use last price as limit"
                    onClick={() => tradeUi.setLimitPrice(stats.lastTrade!.price)}
                    style={{
                      background: "transparent",
                      border: "1px dashed rgba(255,255,255,0.2)",
                      color: "inherit",
                      borderRadius: 6,
                      padding: "0 6px",
                      cursor: "pointer",
                    }}
                  >
                    {stats.lastTrade.price} × {stats.lastTrade.quantity}
                  </button>
                ) : (
                  <>
                    {stats.lastTrade.price} × {stats.lastTrade.quantity}
                  </>
                )}{" "}
                @ {new Date(stats.lastTrade.createdAt).toLocaleTimeString()}
              </div>
            ) : (
              <div style={{ marginTop: 4, opacity: 0.65 }}>No trades yet.</div>
            )}
            {stats?.internal24h ? (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)", opacity: 0.82 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Internal book (24h)</div>
                {stats.internal24h.tradeCount <= 0 ? (
                  <span style={{ opacity: 0.7 }}>No fills on this pair in the rolling 24h window.</span>
                ) : (
                  <>
                    <div>
                      {stats.internal24h.tradeCount} trade{stats.internal24h.tradeCount === 1 ? "" : "s"} · Vol{" "}
                      {stats.internal24h.volumeQuote} {stats.quoteAsset ?? ""} / {stats.internal24h.volumeBase}{" "}
                      {stats.baseAsset ?? ""}
                    </div>
                    {stats.internal24h.change24hPct != null ? (
                      <div
                        style={{
                          marginTop: 2,
                          color:
                            Number(stats.internal24h.change24hPct) > 0
                              ? "#6dffb4"
                              : Number(stats.internal24h.change24hPct) < 0
                                ? "#ff8a8a"
                                : "rgba(255,255,255,0.75)",
                        }}
                      >
                        24h Δ{" "}
                        <b>
                          {Number(stats.internal24h.change24hPct) > 0 ? "+" : ""}
                          {stats.internal24h.change24hPct}%
                        </b>
                        {stats.internal24h.firstPrice != null && stats.internal24h.lastPrice != null ? (
                          <span style={{ opacity: 0.75, fontWeight: 400 }}>
                            {" "}
                            (first {stats.internal24h.firstPrice} → last {stats.internal24h.lastPrice})
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {stats.internal24h.high != null && stats.internal24h.low != null ? (
                      <div style={{ marginTop: 2, opacity: 0.88 }}>
                        High <b>{stats.internal24h.high}</b> · Low <b>{stats.internal24h.low}</b>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}
        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: -4 }}>Asks</div>
        {levels(book?.asks ?? [], "ask")}
        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: -4 }}>Bids</div>
        {levels(book?.bids ?? [], "bid")}
      </div>
    </Card>
  );
}

type BalancesResponse = {
  ok: true;
  base: string;
  quote: string;
  balances: Record<string, { available: string; locked: string }>;
};

type LedgerResponse = {
  ok: true;
  entries: { id: string; kind: string; asset: string; deltaAvail: string; createdAt: string }[];
};

type CexConfigResponse = {
  ok: true;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  limits?: { minNotionalQuote: string | null; minQtyBase: string | null };
  features: {
    paperTransfers: boolean;
    devFunding: boolean;
    feeBps: number;
    feeTreasuryConfigured: boolean;
    liquidityWritesEnabled?: boolean;
    poolMatchingEnabled?: boolean;
    stakingAdjustsCexTakerFees?: boolean;
    stakingBoostsDexReferralShare?: boolean;
    launchpadEnabled?: boolean;
  };
  liquidity?: {
    readApi?: boolean;
    writesEnabled?: boolean;
    poolMatchingEnabled?: boolean;
    liqMiningEnabled?: boolean;
  };
};

export function BalancesPanel() {
  const wallet = useWallet();
  const [cexConfig, setCexConfig] = useState<CexConfigResponse | null>(null);
  const [bal, setBal] = useState<BalancesResponse | null>(null);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [xferAsset, setXferAsset] = useState("");
  const [xferAmt, setXferAmt] = useState("1000");
  const [msg, setMsg] = useState<string | null>(null);
  const [lpPoolId, setLpPoolId] = useState("");
  const [lpBaseAmt, setLpBaseAmt] = useState("100");
  const [lpQuoteAmt, setLpQuoteAmt] = useState("100");
  const [lpBurnAmt, setLpBurnAmt] = useState("10");
  const [lpRewardInfo, setLpRewardInfo] = useState<
    | {
        poolId: string;
        rewardAsset: string | null;
        rewardRatePerSecond: string | null;
        unclaimedReward: string;
        liqMiningMultiplierBps?: number;
        liqMiningEffectiveRewardRatePerSecond?: string | null;
      }
    | null
  >(null);

  const authed = wallet.status === "connected" && !!wallet.user?.id;

  useEffect(() => {
    let cancelled = false;
    apiGet<CexConfigResponse>("/v1/cex/config")
      .then((r) => {
        if (cancelled) return;
        setCexConfig(r);
        setXferAsset((prev) => (prev ? prev : r.quoteAsset));
      })
      .catch(() => {
        if (!cancelled) setCexConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = () => {
    if (!authed) {
      setBal(null);
      setLedger(null);
      return;
    }
    apiGet<BalancesResponse>("/v1/cex/balances")
      .then((r) => setBal(r))
      .catch(() => setBal(null));
    apiGet<LedgerResponse>("/v1/cex/ledger?limit=8")
      .then((r) => setLedger(r))
      .catch(() => setLedger(null));
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, wallet.user?.id]);

  const canLpWrite = cexConfig?.features?.liquidityWritesEnabled === true || cexConfig?.liquidity?.writesEnabled === true;

  useEffect(() => {
    if (!canLpWrite) return;
    let cancelled = false;
    apiGet<{ ok: true; pools: { id: string }[] }>("/v1/cex/liquidity/pools")
      .then((r) => {
        if (cancelled) return;
        const id = r.pools?.[0]?.id;
        if (id) setLpPoolId((prev) => prev || id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [canLpWrite]);

  useEffect(() => {
    if (!canLpWrite || !lpPoolId) return;
    let cancelled = false;
    Promise.all([
      apiGet<{
        ok: true;
        positions: {
          poolId: string;
          rewardAsset: string | null;
          rewardRatePerSecond: string | null;
          unclaimedReward: string;
        }[];
      }>("/v1/cex/liquidity/positions"),
      apiGet<{
        ok: true;
        pool: {
          rewardAsset: string | null;
          rewardRatePerSecond: string | null;
          liqMiningMultiplierBps?: number;
          liqMiningEffectiveRewardRatePerSecond?: string | null;
        };
      }>(`/v1/cex/liquidity/pools/${encodeURIComponent(lpPoolId)}`),
    ])
      .then(([rPos, rPool]) => {
        if (cancelled) return;
        const p = rPos.positions.find((x) => x.poolId === lpPoolId);
        const pool = rPool.pool;
        if (p) {
          setLpRewardInfo({
            poolId: p.poolId,
            rewardAsset: pool.rewardAsset ?? p.rewardAsset,
            rewardRatePerSecond: pool.rewardRatePerSecond ?? p.rewardRatePerSecond,
            unclaimedReward: p.unclaimedReward,
            liqMiningMultiplierBps: pool.liqMiningMultiplierBps,
            liqMiningEffectiveRewardRatePerSecond: pool.liqMiningEffectiveRewardRatePerSecond ?? null,
          });
        } else {
          setLpRewardInfo(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLpRewardInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [canLpWrite, lpPoolId]);

  async function paper(op: "deposit" | "withdraw") {
    setMsg(null);
    if (!authed) {
      setMsg("Sign in first (Wallet page).");
      return;
    }
    try {
      await apiPost(`/v1/cex/${op}`, { asset: xferAsset, amount: xferAmt });
      setMsg(op === "deposit" ? "Deposit credited." : "Withdrawal debited.");
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Transfer failed");
    }
  }

  async function quickDevFund(asset: string, amount: string) {
    setMsg(null);
    if (!authed) return;
    try {
      await apiPost("/v1/cex/dev/fund", { asset, amount });
      setMsg(`Dev credit: +${amount} ${asset}`);
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Dev fund failed");
    }
  }

  async function liquidityAdd() {
    setMsg(null);
    if (!authed) {
      setMsg("Sign in first (Wallet page).");
      return;
    }
    if (!lpPoolId) {
      setMsg("Pool id not loaded yet.");
      return;
    }
    try {
      await apiPost("/v1/cex/liquidity/add", {
        poolId: lpPoolId,
        baseAmount: lpBaseAmt.trim(),
        quoteAmount: lpQuoteAmt.trim(),
      });
      setMsg("Liquidity added.");
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Add liquidity failed");
    }
  }

  async function liquidityRemove() {
    setMsg(null);
    if (!authed) {
      setMsg("Sign in first (Wallet page).");
      return;
    }
    if (!lpPoolId) {
      setMsg("Pool id not loaded yet.");
      return;
    }
    try {
      await apiPost("/v1/cex/liquidity/remove", {
        poolId: lpPoolId,
        lpShares: lpBurnAmt.trim(),
      });
      setMsg("Liquidity removed.");
      refresh();
      // Refresh reward info after LP change.
      setTimeout(() => {
        if (lpPoolId) {
          apiGet<{
            ok: true;
            positions: {
              poolId: string;
              rewardAsset: string | null;
              rewardRatePerSecond: string | null;
              unclaimedReward: string;
            }[];
          }>("/v1/cex/liquidity/positions")
            .then((r) => {
              const p = r.positions.find((x) => x.poolId === lpPoolId);
              if (p) {
                setLpRewardInfo({
                  poolId: p.poolId,
                  rewardAsset: p.rewardAsset,
                  rewardRatePerSecond: p.rewardRatePerSecond,
                  unclaimedReward: p.unclaimedReward,
                });
              } else {
                setLpRewardInfo(null);
              }
            })
            .catch(() => setLpRewardInfo(null));
        }
      }, 0);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Remove liquidity failed");
    }
  }

  const base = bal?.base ?? cexConfig?.baseAsset ?? "";
  const quote = bal?.quote ?? cexConfig?.quoteAsset ?? "";
  const pairLabel = cexConfig?.symbol ?? (base && quote ? `${base}/${quote}` : "—");
  const canPaper = cexConfig?.features?.paperTransfers === true;
  const canDevFund = cexConfig?.features?.devFunding === true;
  const poolMatching =
    cexConfig?.features?.poolMatchingEnabled === true || cexConfig?.liquidity?.poolMatchingEnabled === true;

  return (
    <Card title={`Balances · ${pairLabel}`} right={<Pill tone="info">Paper</Pill>}>
      {!cexConfig ? (
        <div style={{ fontSize: 13, opacity: 0.8 }}>Loading CEX config…</div>
      ) : !authed ? (
        <div style={{ fontSize: 13, opacity: 0.85 }}>Connect and sign in to view balances.</div>
      ) : !base || !quote ? (
        <div style={{ fontSize: 13, opacity: 0.85 }}>Could not resolve pair assets.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{base}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                Avail {bal?.balances?.[base]?.available ?? "—"} · Lock {bal?.balances?.[base]?.locked ?? "—"}
              </div>
            </div>
            <div style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{quote}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>
                Avail {bal?.balances?.[quote]?.available ?? "—"} · Lock {bal?.balances?.[quote]?.locked ?? "—"}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, opacity: 0.72, lineHeight: 1.45 }}>
            Simulated deposit/withdraw: {canPaper ? "enabled on API." : "off (set CEX_PAPER_TRANSFERS)."} Dev credit:{" "}
            {canDevFund ? "enabled." : "off (set CEX_DEV_FUNDING)."} Pool matching:{" "}
            {poolMatching ? "limit (after book) & market IOC → pool when price allows." : "off (set CEX_POOL_MATCHING_ENABLED)."} Taker fee:{" "}
            {(cexConfig.features?.feeBps ?? 0) > 0
              ? `${cexConfig.features?.feeBps} bps${cexConfig.features?.feeTreasuryConfigured ? " (treasury set)" : " (burn if no treasury)"}.`
              : "off."}
          </div>

          {canDevFund ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button variant="secondary" style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => void quickDevFund(base, "10000")}>
                +10k {base} (dev)
              </Button>
              <Button variant="secondary" style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => void quickDevFund(quote, "5000")}>
                +5k {quote} (dev)
              </Button>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            <select
              value={xferAsset || quote}
              onChange={(e) => setXferAsset(e.target.value)}
              style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
            >
              <option value={base}>{base}</option>
              <option value={quote}>{quote}</option>
            </select>
            <input
              value={xferAmt}
              onChange={(e) => setXferAmt(e.target.value)}
              placeholder="Amount"
              style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Button disabled={!canPaper} onClick={() => void paper("deposit")}>
                Deposit (sim)
              </Button>
              <Button disabled={!canPaper} variant="danger" onClick={() => void paper("withdraw")}>
                Withdraw (sim)
              </Button>
            </div>
            {!canPaper ? (
              <div style={{ fontSize: 11, opacity: 0.65 }}>Enable paper transfers on the backend to use these buttons.</div>
            ) : null}
          </div>

          {canLpWrite ? (
            <div
              style={{
                paddingTop: 10,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700 }}>Internal pool (LP)</div>
              <div style={{ fontSize: 11, opacity: 0.68, lineHeight: 1.45 }}>
                Constant-product pool for the CEX pair. After the first deposit, extra base or quote is truncated to the current ratio.
              </div>
              {lpRewardInfo && lpRewardInfo.rewardAsset ? (
                <div style={{ fontSize: 11, opacity: 0.78, lineHeight: 1.45 }}>
                  Pending rewards: {lpRewardInfo.unclaimedReward} {lpRewardInfo.rewardAsset}
                  {lpRewardInfo.liqMiningEffectiveRewardRatePerSecond ? (
                    <>
                      {" "}
                      · emission {lpRewardInfo.liqMiningEffectiveRewardRatePerSecond}/sec (pool-wide, mining boost)
                    </>
                  ) : lpRewardInfo.rewardRatePerSecond ? (
                    ` · emission ${lpRewardInfo.rewardRatePerSecond}/sec (pool-wide)`
                  ) : (
                    ""
                  )}
                  .
                  <Button
                    variant="secondary"
                    style={{ fontSize: 11, marginLeft: 8, padding: "4px 8px" }}
                    onClick={async () => {
                      if (!lpPoolId) return;
                      try {
                        setMsg(null);
                        const res = await apiPost<{ ok: boolean; claimed?: string; asset?: string; error?: string }>(
                          "/v1/cex/liquidity/rewards/claim",
                          { poolId: lpPoolId }
                        );
                        if (res.ok && res.claimed && res.asset) {
                          setMsg(`Claimed ${res.claimed} ${res.asset} rewards.`);
                          refresh();
                        } else if (!res.ok && res.error) {
                          setMsg(res.error);
                        }
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : "Claim failed");
                      }
                    }}
                  >
                    Claim
                  </Button>
                </div>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  value={lpBaseAmt}
                  onChange={(e) => setLpBaseAmt(e.target.value)}
                  placeholder={`${base} amount`}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "white",
                    fontSize: 12,
                  }}
                />
                <input
                  value={lpQuoteAmt}
                  onChange={(e) => setLpQuoteAmt(e.target.value)}
                  placeholder={`${quote} amount`}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "white",
                    fontSize: 12,
                  }}
                />
              </div>
              <Button variant="secondary" style={{ fontSize: 12 }} onClick={() => void liquidityAdd()}>
                Add liquidity
              </Button>
              <input
                value={lpBurnAmt}
                onChange={(e) => setLpBurnAmt(e.target.value)}
                placeholder="LP shares to burn"
                style={{
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "white",
                  fontSize: 12,
                }}
              />
              <Button variant="secondary" style={{ fontSize: 12 }} onClick={() => void liquidityRemove()}>
                Remove liquidity
              </Button>
            </div>
          ) : null}

          {msg ? <div style={{ fontSize: 12, opacity: 0.9 }}>{msg}</div> : null}

          <div style={{ fontSize: 11, opacity: 0.75 }}>Recent ledger</div>
          <div style={{ maxHeight: 120, overflow: "auto", fontSize: 11, fontFamily: "ui-monospace, monospace", opacity: 0.88 }}>
            {(ledger?.entries?.length ?? 0) === 0 ? (
              <span style={{ opacity: 0.65 }}>—</span>
            ) : (
              ledger!.entries.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <span>
                    {e.kind} {e.asset} {e.deltaAvail}
                  </span>
                  <span style={{ opacity: 0.65 }}>{new Date(e.createdAt).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

type PlaceOrderResponse = { ok: true; order: Record<string, unknown> };

function parseAmount(s: string): number | null {
  const n = Number.parseFloat(String(s).trim().replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function trimDecimalString(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  const t = n.toFixed(14).replace(/\.?0+$/, "");
  return t || "0";
}

export function OrderEntryPanel() {
  const wallet = useWallet();
  const { limitPrice, setLimitPrice } = useTradeUi();
  const [orderKind, setOrderKind] = useState<"limit" | "market" | "stop_limit">("limit");
  const [stopPrice, setStopPrice] = useState("0.04");
  const [quantity, setQuantity] = useState("10");
  const [quoteBudget, setQuoteBudget] = useState("100");
  const [busy, setBusy] = useState<"buy" | "sell" | "idle">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [limitsHint, setLimitsHint] = useState<string | null>(null);
  const [postOnly, setPostOnly] = useState(false);
  const [clientOrderId, setClientOrderId] = useState("");
  const [cexAssets, setCexAssets] = useState<{ base: string; quote: string } | null>(null);
  const [balData, setBalData] = useState<BalancesResponse | null>(null);
  const [bookStats, setBookStats] = useState<CexStats | null>(null);

  const authed = wallet.status === "connected" && !!wallet.user?.id;

  useEffect(() => {
    let cancelled = false;
    apiGet<CexConfigResponse>("/v1/cex/config")
      .then((r) => {
        if (cancelled) return;
        setCexAssets({ base: r.baseAsset, quote: r.quoteAsset });
        const parts: string[] = [];
        const lim = r.limits;
        if (lim?.minNotionalQuote) parts.push(`min notional ${lim.minNotionalQuote} ${r.quoteAsset}`);
        if (lim?.minQtyBase) parts.push(`min size ${lim.minQtyBase} ${r.baseAsset}`);
        setLimitsHint(parts.length ? parts.join(" · ") : null);
      })
      .catch(() => {
        if (!cancelled) {
          setLimitsHint(null);
          setCexAssets(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authed) {
      setBalData(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      apiGet<BalancesResponse>("/v1/cex/balances")
        .then((r) => {
          if (!cancelled) setBalData(r);
        })
        .catch(() => {
          if (!cancelled) setBalData(null);
        });
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [authed, wallet.user?.id]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      apiGet<CexStats>("/v1/cex/stats")
        .then((r) => {
          if (!cancelled) setBookStats(r);
        })
        .catch(() => {
          if (!cancelled) setBookStats(null);
        });
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const baseSym = cexAssets?.base ?? balData?.base ?? "";
  const quoteSym = cexAssets?.quote ?? balData?.quote ?? "";
  const avQuote = baseSym && quoteSym && balData ? parseAmount(balData.balances[quoteSym]?.available ?? "0") : null;
  const avBase = baseSym && quoteSym && balData ? parseAmount(balData.balances[baseSym]?.available ?? "0") : null;
  const limitPx = parseAmount(limitPrice);
  const qtyNum = parseAmount(quantity);
  const maxBuyBase =
    orderKind !== "market" && limitPx != null && limitPx > 0 && avQuote != null ? avQuote / limitPx : null;
  const maxSellBase = avBase;

  const notional = orderKind !== "market" && limitPx != null && qtyNum != null ? limitPx * qtyNum : null;

  const bestBidN = bookStats?.bestBid != null ? parseAmount(bookStats.bestBid) : null;
  const bestAskN = bookStats?.bestAsk != null ? parseAmount(bookStats.bestAsk) : null;
  const buyCrossesAsk =
    orderKind !== "market" && limitPx != null && bestAskN != null && limitPx >= bestAskN;
  const sellCrossesBid =
    orderKind !== "market" && limitPx != null && bestBidN != null && limitPx <= bestBidN;

  function setBuyQtyFrac(frac: number) {
    if (maxBuyBase == null) return;
    setQuantity(trimDecimalString(maxBuyBase * frac));
  }

  function setSellQtyFrac(frac: number) {
    if (maxSellBase == null) return;
    setQuantity(trimDecimalString(maxSellBase * frac));
  }

  function setBudgetFrac(frac: number) {
    if (avQuote == null) return;
    setQuoteBudget(trimDecimalString(avQuote * frac));
  }

  async function submit(side: "buy" | "sell") {
    setMsg(null);
    if (!authed) {
      setMsg("Sign in with your wallet (Wallet page) so the API session has a user id.");
      return;
    }
    setBusy(side);
    try {
      const cid = clientOrderId.trim();
      const withCid = <T extends Record<string, unknown>>(b: T) => (cid ? { ...b, clientOrderId: cid } : b);
      const body =
        orderKind === "market"
          ? side === "buy"
            ? withCid({ side, orderType: "market", quoteBudget })
            : withCid({ side, orderType: "market", quantity })
          : orderKind === "stop_limit"
            ? withCid({ side, orderType: "stop_limit", stopPrice, price: limitPrice, quantity })
            : withCid({ side, orderType: "limit", price: limitPrice, quantity, postOnly: postOnly || undefined });
      await apiPost<PlaceOrderResponse>("/v1/cex/orders", body);
      setMsg(
        `${side === "buy" ? "Buy" : "Sell"} ${
          orderKind === "market" ? "market " : orderKind === "stop_limit" ? "stop-limit " : ""
        }order placed.`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy("idle");
    }
  }

  const orderPill =
    orderKind === "market" ? "Market" : orderKind === "stop_limit" ? "Stop-limit" : "Limit";

  return (
    <Card title="Buy / Sell Panel" right={<Pill>{orderPill}</Pill>}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant={orderKind === "limit" ? "primary" : "secondary"} style={{ fontSize: 12, padding: "8px 12px" }} onClick={() => setOrderKind("limit")}>
            Limit
          </Button>
          <Button variant={orderKind === "market" ? "primary" : "secondary"} style={{ fontSize: 12, padding: "8px 12px" }} onClick={() => setOrderKind("market")}>
            Market
          </Button>
          <Button variant={orderKind === "stop_limit" ? "primary" : "secondary"} style={{ fontSize: 12, padding: "8px 12px" }} onClick={() => setOrderKind("stop_limit")}>
            Stop-limit
          </Button>
        </div>
        {orderKind === "stop_limit" ? (
          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Stop price (quote) — sell when last ≤ stop; buy when last ≥ stop
            <input
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
            />
          </label>
        ) : null}
        {orderKind === "limit" || orderKind === "stop_limit" ? (
          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Limit price (quote)
            <input
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
            />
          </label>
        ) : null}
        {orderKind === "limit" ? (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.78, cursor: "pointer" }}>
            <input type="checkbox" checked={postOnly} onChange={(e) => setPostOnly(e.target.checked)} />
            <span>Post-only (maker) — reject if the order would cross and take liquidity now</span>
          </label>
        ) : null}
        <label style={{ fontSize: 12, opacity: 0.75 }}>
          Client order id (optional — unique per account for bots / idempotency)
          <input
            value={clientOrderId}
            onChange={(e) => setClientOrderId(e.target.value)}
            placeholder="e.g. strat-001"
            style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
          />
        </label>
        {orderKind === "market" && (
          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Spend budget (quote) — buy only
            <input
              value={quoteBudget}
              onChange={(e) => setQuoteBudget(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
            />
          </label>
        )}
        <label style={{ fontSize: 12, opacity: 0.75 }}>
          {orderKind === "market" ? "Amount (base) — sell only" : "Amount (base)"}
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white" }}
          />
        </label>
        {orderKind === "market" ? (
          <div style={{ fontSize: 11, lineHeight: 1.45, color: "rgba(255,200,140,0.92)" }}>
            Market orders are IOC and consume book liquidity immediately (taker if the book has size).
          </div>
        ) : null}
        {buyCrossesAsk && bookStats?.bestAsk ? (
          <div style={{ fontSize: 11, lineHeight: 1.45, color: "rgba(255,200,120,0.95)" }}>
            Buy limit <b>≥ best ask {bookStats.bestAsk}</b> — will likely match right away as a <b>taker</b> (same as crossing the spread).
          </div>
        ) : null}
        {sellCrossesBid && bookStats?.bestBid ? (
          <div style={{ fontSize: 11, lineHeight: 1.45, color: "rgba(255,200,120,0.95)" }}>
            Sell limit <b>≤ best bid {bookStats.bestBid}</b> — will likely match right away as a <b>taker</b>.
          </div>
        ) : null}
        {authed && baseSym && quoteSym ? (
          <div style={{ display: "grid", gap: 8, fontSize: 11, opacity: 0.82 }}>
            {notional != null ? (
              <div>
                Est. notional ≈{" "}
                <b>{notional.toLocaleString(undefined, { maximumFractionDigits: 8 })}</b> {quoteSym}{" "}
                <span style={{ opacity: 0.65 }}>(limit × size; fees extra on fill)</span>
              </div>
            ) : null}
            {orderKind === "market" ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ opacity: 0.7, marginRight: 4 }}>Budget</span>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={avQuote == null} onClick={() => setBudgetFrac(0.25)}>
                    25%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={avQuote == null} onClick={() => setBudgetFrac(0.5)}>
                    50%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={avQuote == null} onClick={() => setBudgetFrac(1)}>
                    Max
                  </Button>
                  <span style={{ opacity: 0.65 }}>of {avQuote?.toLocaleString() ?? "—"} {quoteSym}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ opacity: 0.7, marginRight: 4 }}>Sell size</span>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxSellBase == null} onClick={() => setSellQtyFrac(0.25)}>
                    25%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxSellBase == null} onClick={() => setSellQtyFrac(0.5)}>
                    50%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxSellBase == null} onClick={() => setSellQtyFrac(1)}>
                    Max
                  </Button>
                  <span style={{ opacity: 0.65 }}>of {avBase?.toLocaleString() ?? "—"} {baseSym}</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ opacity: 0.7, marginRight: 4 }}>Buy size</span>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxBuyBase == null} onClick={() => setBuyQtyFrac(0.25)}>
                    25%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxBuyBase == null} onClick={() => setBuyQtyFrac(0.5)}>
                    50%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxBuyBase == null} onClick={() => setBuyQtyFrac(1)}>
                    Max
                  </Button>
                  <span style={{ opacity: 0.65 }}>
                    of max ≈ {maxBuyBase != null ? trimDecimalString(maxBuyBase) : "—"} {baseSym} @ limit
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ opacity: 0.7, marginRight: 4 }}>Sell size</span>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxSellBase == null} onClick={() => setSellQtyFrac(0.25)}>
                    25%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxSellBase == null} onClick={() => setSellQtyFrac(0.5)}>
                    50%
                  </Button>
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} disabled={maxSellBase == null} onClick={() => setSellQtyFrac(1)}>
                    Max
                  </Button>
                  <span style={{ opacity: 0.65 }}>of {avBase?.toLocaleString() ?? "—"} {baseSym}</span>
                </div>
              </>
            )}
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Button disabled={busy !== "idle"} onClick={() => void submit("buy")}>
            {busy === "buy" ? "…" : "Buy"}
          </Button>
          <Button disabled={busy !== "idle"} variant="danger" onClick={() => void submit("sell")}>
            {busy === "sell" ? "…" : "Sell"}
          </Button>
        </div>
        {msg ? <div style={{ fontSize: 12, opacity: 0.88 }}>{msg}</div> : null}
        {limitsHint ? (
          <div style={{ fontSize: 11, opacity: 0.72 }}>{limitsHint}</div>
        ) : null}
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          <b>Stop-limit</b> stays off-book until the <b>last internal trade</b> crosses the stop (sell: last ≤ stop; buy: last ≥ stop), then
          posts your limit. <b>Market</b> is IOC. Min notional applies to limits and executed market size. Internal matcher only — no 0x.
          Paper funds: <code>POST /v1/cex/dev/fund</code> when <code>CEX_DEV_FUNDING=true</code>.
        </div>
      </div>
    </Card>
  );
}

type OrdersResponse = {
  ok: true;
  orders: {
    id: string;
    side: string;
    orderType?: string;
    stopPrice?: string | null;
    price: string;
    quantity: string;
    filled: string;
    status: string;
    postOnly?: boolean;
    clientOrderId?: string | null;
    createdAt?: string;
  }[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

const CANCEL_ON_LEAVE_KEY = "lidex_cex_cancel_orders_on_leave";

function orderIsActive(o: OrdersResponse["orders"][number]) {
  return o.status === "open" || o.status === "partial" || o.status === "pending_stop";
}

export function OpenOrdersPanel() {
  const wallet = useWallet();
  const [cancelOnLeave, setCancelOnLeave] = useState(false);
  const [tab, setTab] = useState<"open" | "history">("open");
  const [firstPage, setFirstPage] = useState<OrdersResponse["orders"]>([]);
  const [firstMeta, setFirstMeta] = useState<{ nextCursor: string | null; hasMore: boolean }>({
    nextCursor: null,
    hasMore: false,
  });
  const [older, setOlder] = useState<OrdersResponse["orders"]>([]);
  const [olderMeta, setOlderMeta] = useState<{ nextCursor: string | null; hasMore: boolean }>({
    nextCursor: null,
    hasMore: false,
  });
  const [err, setErr] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [extraHistoryLoaded, setExtraHistoryLoaded] = useState(false);
  const skipResetOlderOnPoll = useRef(false);
  const prevTabRef = useRef<"open" | "history">(tab);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setCancelOnLeave(window.localStorage.getItem(CANCEL_ON_LEAVE_KEY) === "true");
    } catch {
      setCancelOnLeave(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLeave = () => {
      try {
        if (window.localStorage.getItem(CANCEL_ON_LEAVE_KEY) !== "true") return;
      } catch {
        return;
      }
      const url = `${backendBaseUrl()}/v1/cex/orders/cancel-all`;
      void fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...lidexModeHeaders() },
        body: JSON.stringify({ includePendingStop: true }),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  const fetchFirstPage = useCallback(async (opts?: { keepOlder?: boolean }) => {
    if (wallet.status !== "connected" || !wallet.user?.id) return;
    try {
      const r = await apiGet<OrdersResponse>("/v1/cex/orders?limit=50");
      setFirstPage(r.orders);
      setFirstMeta({ nextCursor: r.nextCursor ?? null, hasMore: !!r.hasMore });
      setErr(null);
      if (!opts?.keepOlder && !skipResetOlderOnPoll.current) {
        setOlder([]);
        setOlderMeta({ nextCursor: null, hasMore: false });
        setExtraHistoryLoaded(false);
      }
    } catch (e) {
      setFirstPage([]);
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }, [wallet.status, wallet.user?.id]);

  useEffect(() => {
    if (wallet.status !== "connected" || !wallet.user?.id) {
      setFirstPage([]);
      setOlder([]);
      skipResetOlderOnPoll.current = false;
      return;
    }
    void fetchFirstPage();
    const id = setInterval(() => {
      if (!skipResetOlderOnPoll.current) void fetchFirstPage();
    }, 4000);
    return () => clearInterval(id);
  }, [wallet.status, wallet.user?.id, fetchFirstPage]);

  useEffect(() => {
    if (tab === "open" && prevTabRef.current === "history") {
      skipResetOlderOnPoll.current = false;
      setOlder([]);
      setOlderMeta({ nextCursor: null, hasMore: false });
      setExtraHistoryLoaded(false);
      void fetchFirstPage();
    }
    prevTabRef.current = tab;
  }, [tab, fetchFirstPage]);

  async function cancel(id: string) {
    try {
      await apiDelete(`/v1/cex/orders/${id}`);
      skipResetOlderOnPoll.current = false;
      await fetchFirstPage();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  async function cancelAll() {
    try {
      await apiPost<{ ok: boolean; cancelled?: number }>("/v1/cex/orders/cancel-all", { includePendingStop: true });
      skipResetOlderOnPoll.current = false;
      await fetchFirstPage();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cancel all failed");
    }
  }

  async function loadOlder() {
    const cursor = older.length === 0 ? firstMeta.nextCursor : olderMeta.nextCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiGet<OrdersResponse>(`/v1/cex/orders?limit=40&cursor=${encodeURIComponent(cursor)}`);
      skipResetOlderOnPoll.current = true;
      setExtraHistoryLoaded(true);
      setOlder((o) => [...o, ...r.orders]);
      setOlderMeta({ nextCursor: r.nextCursor ?? null, hasMore: !!r.hasMore });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load older orders");
    } finally {
      setLoadingMore(false);
    }
  }

  const open = firstPage.filter(orderIsActive);

  const historyById = new Map<string, OrdersResponse["orders"][number]>();
  for (const o of older) {
    if (!orderIsActive(o)) historyById.set(o.id, o);
  }
  for (const o of firstPage) {
    if (!orderIsActive(o)) historyById.set(o.id, o);
  }
  const history = [...historyById.values()].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  const rows = tab === "open" ? open : history;

  const canLoadOlder =
    tab === "history" &&
    (older.length === 0 ? firstMeta.hasMore && !!firstMeta.nextCursor : olderMeta.hasMore && !!olderMeta.nextCursor);

  return (
    <Card
      title="Orders"
      right={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant={tab === "open" ? "primary" : "secondary"} style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setTab("open")}>
            Open
          </Button>
          <Button variant={tab === "history" ? "primary" : "secondary"} style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setTab("history")}>
            History
          </Button>
          {tab === "open" && open.length > 0 ? (
            <Button variant="danger" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => void cancelAll()}>
              Cancel all
            </Button>
          ) : null}
        </div>
      }
    >
      {wallet.status !== "connected" || !wallet.user?.id ? (
        <div style={{ fontSize: 13, opacity: 0.8 }}>Connect and sign in to see orders.</div>
      ) : err ? (
        <div style={{ fontSize: 13, opacity: 0.9, color: "#ff8a8a" }}>{err}</div>
      ) : rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {tab === "open" ? "No open orders." : "No completed or cancelled orders in the first page. Use “Load older” if you have more."}
          </div>
          {tab === "open" ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.78, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={cancelOnLeave}
                onChange={(e) => {
                  const v = e.target.checked;
                  setCancelOnLeave(v);
                  try {
                    window.localStorage.setItem(CANCEL_ON_LEAVE_KEY, v ? "true" : "false");
                  } catch {
                    /* ignore */
                  }
                }}
              />
              <span>On tab close / navigate away, cancel all open &amp; stop-pending orders (best-effort via keepalive)</span>
            </label>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {tab === "open" ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.78, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={cancelOnLeave}
                onChange={(e) => {
                  const v = e.target.checked;
                  setCancelOnLeave(v);
                  try {
                    window.localStorage.setItem(CANCEL_ON_LEAVE_KEY, v ? "true" : "false");
                  } catch {
                    /* ignore */
                  }
                }}
              />
              <span>Cancel resting orders when leaving this tab (keepalive; not a guarantee)</span>
            </label>
          ) : null}
          {tab === "history" ? (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.75, lineHeight: 1.45 }}>
              <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => void fetchFirstPage({ keepOlder: extraHistoryLoaded })}>
                Refresh latest
              </Button>
              {extraHistoryLoaded ? (
                <span>
                  Auto-refresh paused for deep pages — switch to <b>Open</b> to fully resync.
                </span>
              ) : null}
            </div>
          ) : null}
          <div
            style={{
              display: "grid",
              gap: 8,
              fontSize: 12,
              maxHeight: tab === "history" ? 280 : undefined,
              overflowY: tab === "history" ? "auto" : undefined,
            }}
          >
            {rows.map((o) => (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {o.side}
                  {o.orderType ? ` · ${o.orderType}` : ""}
                </span>
                <span>
                  {o.orderType === "stop_limit" && o.stopPrice != null ? <>stop {o.stopPrice} → lim {o.price}</> : <>{o.price}</>} ×{" "}
                  {o.quantity} (filled {o.filled})
                  {o.status === "pending_stop" ? " · armed" : null}
                  {o.postOnly ? " · post-only" : null}
                  {o.clientOrderId ? (
                    <span style={{ opacity: 0.75, marginLeft: 4 }}>
                      · clid <code style={{ fontSize: 11 }}>{o.clientOrderId}</code>
                    </span>
                  ) : null}
                  {tab === "history" ? (
                    <span style={{ opacity: 0.75, marginLeft: 6 }}>
                      · {o.status}
                      {o.createdAt ? ` · ${new Date(o.createdAt).toLocaleString()}` : ""}
                    </span>
                  ) : null}
                </span>
                {tab === "open" ? (
                  <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => void cancel(o.id)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {tab === "history" && canLoadOlder ? (
            <Button variant="secondary" disabled={loadingMore} onClick={() => void loadOlder()} style={{ fontSize: 12 }}>
              {loadingMore ? "Loading…" : "Load older"}
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}

export function TradeHistoryPanel() {
  const wallet = useWallet();
  const [scope, setScope] = useState<"market" | "mine">("market");
  const [firstTrades, setFirstTrades] = useState<TradesResponse["trades"]>([]);
  const [firstMeta, setFirstMeta] = useState<{ nextCursor: string | null; hasMore: boolean }>({
    nextCursor: null,
    hasMore: false,
  });
  const [older, setOlder] = useState<TradesResponse["trades"]>([]);
  const [olderMeta, setOlderMeta] = useState<{ nextCursor: string | null; hasMore: boolean }>({
    nextCursor: null,
    hasMore: false,
  });
  const [err, setErr] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [extraLoaded, setExtraLoaded] = useState(false);
  const [tradesSseLive, setTradesSseLive] = useState(false);
  const skipResetExtraOnPoll = useRef(false);
  const extraLoadedRef = useRef(false);
  const prevScopeRef = useRef(scope);

  const authed = wallet.status === "connected" && !!wallet.user?.id;

  useEffect(() => {
    extraLoadedRef.current = extraLoaded;
  }, [extraLoaded]);

  const fetchFirstTrades = useCallback(
    async (opts?: { keepOlder?: boolean }) => {
      if (scope === "mine" && !authed) {
        setErr("Sign in on the Wallet page to see your trades.");
        setFirstTrades([]);
        return;
      }
      setErr(null);
      const path =
        scope === "mine" ? "/v1/cex/trades?mine=true&limit=40" : "/v1/cex/trades?limit=40";
      try {
        const r = await apiGet<TradesResponse>(path);
        setFirstTrades(r.trades);
        setFirstMeta({ nextCursor: r.nextCursor ?? null, hasMore: !!r.hasMore });
        if (!opts?.keepOlder && !skipResetExtraOnPoll.current) {
          setOlder([]);
          setOlderMeta({ nextCursor: null, hasMore: false });
          setExtraLoaded(false);
        }
      } catch (e) {
        setFirstTrades([]);
        setErr(e instanceof Error ? e.message : "Failed to load trades");
      }
    },
    [scope, authed]
  );

  useEffect(() => {
    if (prevScopeRef.current !== scope) {
      skipResetExtraOnPoll.current = false;
      setOlder([]);
      setOlderMeta({ nextCursor: null, hasMore: false });
      setExtraLoaded(false);
      prevScopeRef.current = scope;
    }
  }, [scope]);

  useEffect(() => {
    if (scope === "mine" && !authed) {
      setFirstTrades([]);
      setOlder([]);
      skipResetExtraOnPoll.current = false;
      setExtraLoaded(false);
    }
  }, [scope, authed]);

  useEffect(() => {
    const useSseMarket = scope === "market" && browserLidexMode() === "cex";
    if (useSseMarket) return;

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (scope === "mine" && !authed) return;
      if (!skipResetExtraOnPoll.current) void fetchFirstTrades();
    };
    void fetchFirstTrades();
    const id = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [scope, authed, fetchFirstTrades]);

  useEffect(() => {
    if (scope !== "market" || browserLidexMode() !== "cex") {
      setTradesSseLive(false);
      return;
    }

    let cancelled = false;
    let es: EventSource | null = null;
    let pollFallback: ReturnType<typeof setInterval> | null = null;

    const clearFallback = () => {
      if (pollFallback) clearInterval(pollFallback);
      pollFallback = null;
    };

    void fetchFirstTrades();
    setTradesSseLive(false);

    const url = `${backendBaseUrl()}/v1/cex/stream?lidex_mode=cex`;
    es = new EventSource(url, { withCredentials: true });

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as CexStreamMsg;
        if (cancelled || !msg.ok || !Array.isArray(msg.trades)) return;
        if (skipResetExtraOnPoll.current || extraLoadedRef.current) return;
        setFirstTrades(msg.trades);
        setFirstMeta({
          nextCursor: msg.tradesNextCursor ?? null,
          hasMore: !!msg.tradesHasMore,
        });
        setErr(null);
        setTradesSseLive(true);
      } catch {
        if (!cancelled) setErr("Invalid stream data");
      }
    };

    es.onerror = () => {
      if (cancelled) return;
      es?.close();
      es = null;
      setTradesSseLive(false);
      if (pollFallback != null) return;
      pollFallback = setInterval(() => {
        if (cancelled || skipResetExtraOnPoll.current) return;
        void fetchFirstTrades();
      }, 5000);
    };

    return () => {
      cancelled = true;
      es?.close();
      clearFallback();
    };
  }, [scope, fetchFirstTrades]);

  async function loadOlderTrades() {
    const cursor = older.length === 0 ? firstMeta.nextCursor : olderMeta.nextCursor;
    if (!cursor || loadingMore) return;
    const path =
      scope === "mine"
        ? `/v1/cex/trades?mine=true&limit=30&cursor=${encodeURIComponent(cursor)}`
        : `/v1/cex/trades?limit=30&cursor=${encodeURIComponent(cursor)}`;
    setLoadingMore(true);
    try {
      const r = await apiGet<TradesResponse>(path);
      skipResetExtraOnPoll.current = true;
      setExtraLoaded(true);
      setOlder((o) => [...o, ...r.trades]);
      setOlderMeta({ nextCursor: r.nextCursor ?? null, hasMore: !!r.hasMore });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load older trades");
    } finally {
      setLoadingMore(false);
    }
  }

  const byId = new Map<string, TradesResponse["trades"][number]>();
  for (const t of older) byId.set(t.id, t);
  for (const t of firstTrades) byId.set(t.id, t);
  const rows = [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const canLoadOlder =
    older.length === 0 ? firstMeta.hasMore && !!firstMeta.nextCursor : olderMeta.hasMore && !!olderMeta.nextCursor;

  return (
    <Card
      title="Trade History"
      right={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {scope === "market" && browserLidexMode() === "cex" ? (
            <Pill tone={tradesSseLive ? "info" : "muted"}>{tradesSseLive ? "Live" : "Polling"}</Pill>
          ) : null}
          <Button variant={scope === "market" ? "primary" : "secondary"} style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setScope("market")}>
            Market
          </Button>
          <Button variant={scope === "mine" ? "primary" : "secondary"} style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setScope("mine")}>
            Mine
          </Button>
        </div>
      }
    >
      {err ? (
        <div style={{ fontSize: 13, opacity: 0.88, color: "#ff8a8a" }}>{err}</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          {scope === "mine" ? "You have no fills on this pair yet." : "No recent internal trades."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.75 }}>
            <Button variant="secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => void fetchFirstTrades({ keepOlder: extraLoaded })}>
              Refresh latest
            </Button>
            {extraLoaded ? <span>Auto-refresh paused while extra trades are loaded.</span> : null}
          </div>
          <div style={{ maxHeight: 220, overflow: "auto", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
            {rows.map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, opacity: 0.9 }}>
                <span>
                  {t.price} × {t.quantity}
                  {scope === "mine" ? (
                    <span style={{ opacity: 0.65, marginLeft: 6 }}>
                      {wallet.user?.id === t.takerUserId ? "(taker)" : "(maker)"}
                    </span>
                  ) : null}
                </span>
                <span style={{ opacity: 0.6 }}>{new Date(t.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          {canLoadOlder ? (
            <Button variant="secondary" disabled={loadingMore} onClick={() => void loadOlderTrades()} style={{ fontSize: 12 }}>
              {loadingMore ? "Loading…" : "Load older trades"}
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}

