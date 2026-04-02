"use client";

import React, { useMemo, useState } from "react";
import { Grid, PageShell, Pill, Span, Card, Button } from "../../components/ui";
import {
  ChartPanel,
  DEFAULT_TRADE_CHART_SYMBOL,
  OpenOrdersPanel,
  OrderbookPanel,
  OrderEntryPanel,
  PairHeader,
  TradeHistoryPanel
} from "./components/Panels";

export default function TradePage() {
  const [mobilePanel, setMobilePanel] = useState<"chart" | "orderbook" | "order" | "orders" | "history">("chart");
  const mobileTabs = useMemo(
    () =>
      [
        { id: "chart", label: "Chart" },
        { id: "orderbook", label: "Orderbook" },
        { id: "order", label: "Order" },
        { id: "orders", label: "Open Orders" },
        { id: "history", label: "History" }
      ] as const,
    []
  );

  return (
    <PageShell title="Trade" subtitle="CEX Full dashboard (desktop 3-column, mobile tabs).">
      <Card title="Phase 1 note" right={<Pill tone="info">CEX foundation</Pill>}>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          This Trade page is a <b>foundation UI</b> only in Phase 1. It does <b>not</b> use 0x (0X/OX) or execute real trades yet.
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Phase 2 will connect this to the internal orderbook / matching engine and custodial balances.
          </div>
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
              <OrderEntryPanel />
              <div style={{ marginTop: 12 }}>
                <TradeHistoryPanel />
              </div>
            </Span>
          </Grid>
        </div>
      </div>
    </PageShell>
  );
}

