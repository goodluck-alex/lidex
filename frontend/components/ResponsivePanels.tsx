"use client";

import React, { useMemo, useState } from "react";
import { SegmentTabs } from "./ui";

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
  return <SegmentTabs value={value} onChange={onChange} tabs={tabs} />;
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
