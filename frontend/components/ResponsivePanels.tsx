"use client";

import React, { useMemo, useState } from "react";

export type PanelTab<T extends string> = { id: T; label: string };

export function MobileTabs<T extends string>({
  value,
  onChange,
  tabs
}: {
  value: T;
  onChange: (next: T) => void;
  tabs: readonly PanelTab<T>[];
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
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
  );
}

export function ResponsivePanels<T extends string>({
  tabs,
  renderMobile,
  children
}: {
  tabs: readonly PanelTab<T>[];
  renderMobile: (active: T, setActive: (t: T) => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const defaultTab = tabs[0]?.id;
  const [active, setActive] = useState<T>(defaultTab);
  const stableTabs = useMemo(() => tabs, [tabs]);

  if (!defaultTab) return <>{children}</>;

  return (
    <>
      <div className="lidex-show-mobile">
        <MobileTabs value={active} onChange={setActive} tabs={stableTabs} />
        {renderMobile(active, setActive)}
      </div>
      <div className="lidex-hide-mobile">{children}</div>
    </>
  );
}

