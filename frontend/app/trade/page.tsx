"use client";

import React, { useMemo, useState } from "react";
import { Grid, PageShell, Pill, Span, Card, Button } from "../../components/ui";
import {
  BalancesPanel,
  ChartPanel,
  DEFAULT_TRADE_CHART_SYMBOL,
  OpenOrdersPanel,
  OrderbookPanel,
  OrderEntryPanel,
  PairHeader,
  TradeHistoryPanel
} from "./components/Panels";
import { TradeUiProvider } from "./components/TradeUiContext";

export default function TradePage() {
  const [mobilePanel, setMobilePanel] = useState<"chart" | "orderbook" | "balances" | "order" | "orders" | "history">("chart");
  const mobileTabs = useMemo(
    () =>
      [
        { id: "chart", label: "Chart" },
        { id: "orderbook", label: "Orderbook" },
        { id: "balances", label: "Balances" },
        { id: "order", label: "Order" },
        { id: "orders", label: "Orders" },
        { id: "history", label: "History" }
      ] as const,
    []
  );

  return (
    <TradeUiProvider>
    <PageShell title="Trade" subtitle="CEX Full dashboard (desktop 3-column, mobile tabs).">
      <Card title="CEX matcher" right={<Pill tone="success">Phase 3</Pill>}>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          Limit orders hit an <b>internal matcher</b> for the pair configured on the API (default <code>LDX/USDT</code>).{" "}
          <b>No 0x</b> on this path. Sign in on the Wallet page. Paper money: <code>CEX_DEV_FUNDING=true</code> (quick credit) and/or{" "}
          <code>CEX_PAPER_TRANSFERS=true</code> (simulated deposit/withdraw with <code>/v1/cex/ledger</code> audit).
        </div>
      </Card>
      <Card title={DEFAULT_TRADE_CHART_SYMBOL} right={<Pill tone="info">Orderbook</Pill>}>
        <PairHeader symbol={DEFAULT_TRADE_CHART_SYMBOL} />
      </Card>

      <div style={{ marginTop: 12 }}>
        {/* Mobile: tabbed panels */}
        <div className="lidex-show-mobile">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {mobileTabs.map((t) => {
              const active = mobilePanel === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMobilePanel(t.id)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: active ? "rgba(0,200,150,0.18)" : "rgba(255,255,255,0.06)",
                    color: "white",
                    padding: "8px 10px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <Grid columns={12} gap={12}>
            <Span col={12}>
              {mobilePanel === "chart" ? <ChartPanel symbol={DEFAULT_TRADE_CHART_SYMBOL} /> : null}
              {mobilePanel === "orderbook" ? <OrderbookPanel /> : null}
              {mobilePanel === "balances" ? <BalancesPanel /> : null}
              {mobilePanel === "order" ? <OrderEntryPanel /> : null}
              {mobilePanel === "orders" ? <OpenOrdersPanel /> : null}
              {mobilePanel === "history" ? <TradeHistoryPanel /> : null}
            </Span>
          </Grid>
        </div>

        {/* Desktop: true 3-column dashboard */}
        <div className="lidex-hide-mobile">
          <Grid>
            <Span col={6}>
              <ChartPanel symbol={DEFAULT_TRADE_CHART_SYMBOL} />
              <div style={{ marginTop: 12 }}>
                <OpenOrdersPanel />
              </div>
            </Span>

            <Span col={3}>
              <OrderbookPanel />
            </Span>

            <Span col={3}>
              <BalancesPanel />
              <div style={{ marginTop: 12 }}>
                <OrderEntryPanel />
              </div>
              <div style={{ marginTop: 12 }}>
                <TradeHistoryPanel />
              </div>
            </Span>
          </Grid>
        </div>
      </div>
    </PageShell>
    </TradeUiProvider>
  );
}

