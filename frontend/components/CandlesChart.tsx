"use client";

import React, { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number };

type Props = { candles: Candle[]; height: number };

/**
 * Candlestick chart (lightweight-charts v5). Styling aligned with the “Lidex / Binance-style”
 * dark theme; data comes from your API (`time` = Unix seconds).
 */
export function CandlesChart({ candles, height }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0B0E11" },
        textColor: "#DDD",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
      },
      rightPriceScale: {
        borderColor: "#485c7b",
      },
      timeScale: {
        borderColor: "#485c7b",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: true,
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles?.length) return;
    seriesRef.current?.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={elRef}
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
      }}
    />
  );
}
