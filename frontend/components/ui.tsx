"use client";

import React from "react";

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12"
};

const COL_SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12"
};

function gapTw(gap: number) {
  if (gap <= 8) return "gap-2";
  if (gap <= 12) return "gap-3";
  if (gap <= 16) return "gap-4";
  return "gap-5";
}

export function PageShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      suppressHydrationWarning
      className="mx-auto min-h-[calc(100dvh-3.25rem)] w-full max-w-7xl px-4 py-5 sm:min-h-[calc(100dvh-3.5rem)] sm:py-6"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/65">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </main>
  );
}

export function Grid({
  columns = 12,
  gap = 12,
  children
}: {
  columns?: number;
  gap?: number;
  children: React.ReactNode;
}) {
  const cols = GRID_COLS[columns] ?? GRID_COLS[12]!;
  return <div className={`grid ${cols} ${gapTw(gap)}`}>{children}</div>;
}

export function Span({ col, children }: { col: number; children: React.ReactNode }) {
  const span = COL_SPAN[col] ?? COL_SPAN[12]!;
  return <div className={span}>{children}</div>;
}

const CARD_TONE_BORDER: Record<"default" | "success" | "danger" | "info", string> = {
  default: "border-white/10",
  success: "border-[#00c896]/25",
  danger: "border-red-400/25",
  info: "border-[#2979ff]/25"
};

export function Card({
  title,
  right,
  children,
  tone = "default"
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "success" | "danger" | "info";
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white/[0.04] shadow-card backdrop-blur-sm ${CARD_TONE_BORDER[tone]}`}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2.5 sm:px-4">
          <div className="text-sm font-semibold tracking-tight text-white/95">{title}</div>
          <div className="shrink-0">{right}</div>
        </div>
      ) : null}
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" | "info" }) {
  const cls =
    tone === "success"
      ? "border-[#00c896]/35 bg-[#00c896]/14 text-[#b8f5e0]"
      : tone === "info"
        ? "border-[#2979ff]/35 bg-[#2979ff]/14 text-[#b3cdff]"
        : "border-white/12 bg-white/[0.08] text-white/85";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tracking-tight ${cls}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  style: styleProp,
  className = ""
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  const variantCls =
    variant === "primary"
      ? "border border-emerald-950/30 bg-[#00c896] text-[#04120c] hover:opacity-90 active:opacity-95"
      : variant === "danger"
        ? "border border-red-950/40 bg-red-500/90 text-white hover:opacity-90 active:opacity-95"
        : "border border-white/14 bg-white/[0.08] text-white hover:bg-white/[0.12] active:bg-white/[0.14]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={styleProp}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${variantCls} ${className}`}
    >
      {children}
    </button>
  );
}

/** Rounded segment tabs — used under mobile layouts (trade, markets panels, etc.). */
export function SegmentTabs<T extends string>({
  value,
  onChange,
  tabs
}: {
  value: T;
  onChange: (next: T) => void;
  tabs: readonly { id: T; label: string }[];
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-full border px-2.5 py-2 text-xs font-bold transition-colors ${
              active
                ? "border-[#00c896]/40 bg-[#00c896]/18 text-white shadow-sm"
                : "border-white/12 bg-white/[0.06] text-white/85 hover:border-white/18 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
