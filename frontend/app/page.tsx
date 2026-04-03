"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMode } from "../context/mode";
import { Button, Card, Grid, PageShell, Pill, Span } from "../components/ui";
import { setRefCode } from "../wallet/referral";
import { apiGet } from "../services/api";

type MarketTokenMeta = { symbol: string; name: string; logoUrl: string | null };
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

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000 ? n.toFixed(2) : n >= 10 ? n.toFixed(4) : n.toFixed(6);
}
function fmtChangePct(n: number | null | undefined) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function HomePage() {
  const router = useRouter();
  const { setMode } = useMode();
  const [pairs, setPairs] = useState<PairsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [mktError, setMktError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const ref = u.searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMktError(null);
        const [p, s] = await Promise.all([apiGet<PairsResponse>("/v1/markets/pairs"), apiGet<StatsResponse>("/v1/markets/stats")]);
        if (cancelled) return;
        setPairs(p);
        setStats(s);
      } catch (e) {
        if (cancelled) return;
        setMktError(e instanceof Error ? e.message : "Failed to load markets");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const topPairs = useMemo(() => {
    const list = [...(pairs?.active || []), ...(pairs?.comingSoon || [])];
    const wanted = ["LDX/USDT", "ETH/USDT", "BNB/USDT"];
    const picked = wanted.map((sym) => list.find((p) => p.symbol === sym)).filter(Boolean) as Pair[];
    return picked.length ? picked : list.slice(0, 3);
  }, [pairs]);

  return (
    <PageShell title="Lidex" subtitle="Trade DeFi & CeFi with LDX Power">
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "radial-gradient(1200px 600px at 15% 20%, rgba(41,121,255,0.30), rgba(11,15,26,0) 60%), radial-gradient(900px 500px at 85% 15%, rgba(0,200,150,0.22), rgba(11,15,26,0) 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          overflow: "hidden"
        }}
      >
        <div style={{ padding: 18 }}>
          <Grid>
            <Span col={7}>
              <div style={{ display: "grid", gap: 10, padding: "10px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/lidex-logo.png" alt="Lidex" width={36} height={36} style={{ borderRadius: 999, display: "block" }} />
                  <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>Lidex</div>
                </div>

                <div style={{ fontSize: 38, fontWeight: 950, lineHeight: 1.05 }}>
                  The Ultimate <span style={{ color: "#7aa7ff" }}>Hybrid</span>
                  <br />
                  Crypto Exchange
                </div>

                <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6, maxWidth: 520 }}>
                  Swap instantly in DEX Lite, or unlock the full CEX dashboard with charts, orderbook, staking, and launchpad.
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <Button
                    onClick={() => {
                      setMode("dex");
                      router.push("/dex/swap");
                    }}
                  >
                    Get Started
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      router.push("/docs");
                    }}
                  >
                    Learn More
                  </Button>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                  <Pill tone="success">Low fees</Pill>
                  <Pill tone="info">Multi-chain</Pill>
                  <Pill>Powered by 0x</Pill>
                </div>
              </div>
            </Span>

            <Span col={5}>
              <div
                style={{
                  height: 260,
                  borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background:
                    "radial-gradient(500px 300px at 50% 20%, rgba(122,167,255,0.30), rgba(0,0,0,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div style={{ textAlign: "center", padding: 14 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Preview</div>
                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900 }}>Trade • Swap • Earn</div>
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>
                    Chart + Orderbook + Wallet + Referral
                  </div>
                </div>
              </div>
            </Span>
          </Grid>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Grid>
          <Span col={4}>
            <Card title="DeFi & CeFi Trading" tone="info" right={<Pill tone="info">Hybrid</Pill>}>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                Seamlessly trade DEX swaps and CEX-style dashboards in one platform foundation.
              </div>
            </Card>
          </Span>
          <Span col={4}>
            <Card title="LDX Staking Rewards" tone="success" right={<Pill tone="success">Earn</Pill>}>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                Stake LDX to access tiers and rewards (Phase 1 foundation, staking UI ready).
              </div>
            </Card>
          </Span>
          <Span col={4}>
            <Card title="Low Fees & Referral Bonuses" right={<Pill>Growth</Pill>}>
              <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                Platform fee engine + referral rewards ledger are built into swap execution.
              </div>
            </Card>
          </Span>
        </Grid>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card
          title="Top Trading Pairs"
          right={
            <Link href="/markets" style={{ color: "white", opacity: 0.85, textDecoration: "none" }}>
              View All Markets →
            </Link>
          }
        >
          <div style={{ display: "grid", gap: 10 }}>
            {mktError ? <div style={{ fontSize: 12, opacity: 0.8 }}>Error: {mktError}</div> : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {topPairs.map((p) => {
                const s = stats?.bySymbol?.[p.symbol];
                const up = (s?.change24hPct ?? 0) >= 0;
                return (
                  <div
                    key={p.symbol}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {p.baseToken?.logoUrl ? (
                          <img src={p.baseToken.logoUrl} alt="" width={24} height={24} style={{ borderRadius: 999, flexShrink: 0 }} />
                        ) : null}
                        {p.quoteToken?.logoUrl ? (
                          <img src={p.quoteToken.logoUrl} alt="" width={24} height={24} style={{ borderRadius: 999, flexShrink: 0, marginLeft: -10 }} />
                        ) : null}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900 }}>{p.symbol}</div>
                          {p.baseToken && p.quoteToken ? (
                            <div style={{ fontSize: 11, opacity: 0.62, marginTop: 2 }}>{p.baseToken.name} · {p.quoteToken.name}</div>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: up ? "#00C896" : "#ff6b6b" }}>
                        {fmtChangePct(s?.change24hPct)}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>Price</div>
                    <div style={{ fontSize: 16, fontWeight: 950 }}>{fmtPrice(s?.price)}</div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>24h Volume</div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>{s?.volume24hQuote ? s.volume24hQuote.toLocaleString() : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Grid>
          <Span col={7}>
            <Card title="Advanced Trading Platform" right={<Pill tone="info">CEX Full</Pill>}>
              <div style={{ display: "grid", gap: 10 }}>
                <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.88, lineHeight: 1.8, fontSize: 13 }}>
                  <li>Pro trading tools</li>
                  <li>Real-time charts (Lightweight Charts)</li>
                  <li>Secure & fast wallet flows</li>
                </ul>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    onClick={() => {
                      setMode("cex");
                      router.push("/cex/trade");
                    }}
                  >
                    Start Trading →
                  </Button>
                  <Link href="/cex/trade" style={{ color: "white", opacity: 0.85, alignSelf: "center" }}>
                    Preview →
                  </Link>
                </div>
              </div>
            </Card>
          </Span>
          <Span col={5}>
            <div
              style={{
                height: 220,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background:
                  "radial-gradient(500px 260px at 55% 20%, rgba(0,200,150,0.22), rgba(0,0,0,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                display: "grid",
                placeItems: "center",
                opacity: 0.9
              }}
            >
              <div style={{ textAlign: "center", padding: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Dashboard Preview</div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 900 }}>Chart + Orderbook</div>
              </div>
            </div>
          </Span>
        </Grid>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card title="Earn Rewards with LDX Staking" right={<Pill tone="success">LDX</Pill>}>
          <Grid>
            <Span col={7}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                  High APY, automatic rewards, flexible locking — staking module is ready to be enabled as Phase 2/3.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode("cex");
                      router.push("/staking");
                    }}
                  >
                    Start Staking →
                  </Button>
                </div>
              </div>
            </Span>
            <Span col={5}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <img src="/lidex-logo.png" alt="LDX" width={110} height={110} style={{ borderRadius: 999, display: "block" }} />
              </div>
            </Span>
          </Grid>
        </Card>
      </div>

      <div style={{ marginTop: 18, padding: "16px 2px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", opacity: 0.75, fontSize: 12 }}>
        <div>© {new Date().getFullYear()} Lidex</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/docs" style={{ color: "white", opacity: 0.85, textDecoration: "none" }}>
            Docs
          </Link>
          <Link href="/settings" style={{ color: "white", opacity: 0.85, textDecoration: "none" }}>
            Settings
          </Link>
          <Link href="/referral" style={{ color: "white", opacity: 0.85, textDecoration: "none" }}>
            Referral
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

