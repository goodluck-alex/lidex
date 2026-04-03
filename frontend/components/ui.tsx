"use client";

import React from "react";

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
      style={{ padding: 18, maxWidth: 1300, margin: "0 auto" }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, letterSpacing: 0.2 }}>{title}</h2>
          {subtitle ? (
            <p style={{ margin: "6px 0 0", opacity: 0.75, fontSize: 13, lineHeight: 1.35 }}>{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>{children}</div>
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
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap
      }}
    >
      {children}
    </div>
  );
}

export function Span({ col, children }: { col: number; children: React.ReactNode }) {
  return <div style={{ gridColumn: `span ${col} / span ${col}` }}>{children}</div>;
}

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
  const border =
    tone === "success"
      ? "rgba(0,200,150,0.25)"
      : tone === "danger"
        ? "rgba(255,90,90,0.22)"
        : tone === "info"
          ? "rgba(41,121,255,0.22)"
          : "rgba(255,255,255,0.10)";

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${border}`,
        borderRadius: 14,
        overflow: "hidden"
      }}
    >
      {title ? (
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 650, opacity: 0.92 }}>{title}</div>
          <div>{right}</div>
        </div>
      ) : null}
      <div style={{ padding: 12 }}>{children}</div>
    </section>
  );
}

export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" | "info" }) {
  const bg =
    tone === "success" ? "rgba(0,200,150,0.18)" : tone === "info" ? "rgba(41,121,255,0.18)" : "rgba(255,255,255,0.08)";
  const border =
    tone === "success" ? "rgba(0,200,150,0.30)" : tone === "info" ? "rgba(41,121,255,0.30)" : "rgba(255,255,255,0.12)";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: 999, background: bg, border: `1px solid ${border}`, fontSize: 12 }}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  style: styleProp
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const bg = variant === "primary" ? "#00C896" : variant === "danger" ? "#e35b5b" : "rgba(255,255,255,0.10)";
  const color = variant === "secondary" ? "white" : "#071016";
  const border = variant === "secondary" ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(0,0,0,0.2)";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        border,
        background: bg,
        color,
        padding: "10px 12px",
        borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        opacity: disabled ? 0.55 : 1,
        ...styleProp
      }}
    >
      {children}
    </button>
  );
}

