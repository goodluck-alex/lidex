"use client";

import React, { useMemo, useState } from "react";
import { Grid, PageShell, Pill, Span, SegmentTabs } from "../../components/ui";
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
    <PageShell title="Trade" subtitle="Chart, order book, balances, and spot orders for the active pair.">
      <div className="mb-4 rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <h2 className="text-lg font-semibold text-white">{DEFAULT_TRADE_CHART_SYMBOL}</h2>
          <Pill tone="info">Overview</Pill>
        </div>
        <div className="mt-4">
          <PairHeader symbol={DEFAULT_TRADE_CHART_SYMBOL} />
        </div>
      </div>

      <div className="mt-3">
        {/* Mobile: tabbed panels */}
        <div className="lidex-show-mobile">
          <SegmentTabs value={mobilePanel} onChange={setMobilePanel} tabs={mobileTabs} />

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
              <div className="mt-3">
                <OpenOrdersPanel />
              </div>
            </Span>

            <Span col={3}>
              <OrderbookPanel />
            </Span>

            <Span col={3}>
              <BalancesPanel />
              <div className="mt-3">
                <OrderEntryPanel />
              </div>
              <div className="mt-3">
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

