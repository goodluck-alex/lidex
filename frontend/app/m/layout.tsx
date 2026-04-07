import React from "react";
import { MobileBottomNav } from "../../components/mobile/MobileBottomNav";

export default function MobileAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0b0f1a]">
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))]">{children}</div>
      <MobileBottomNav />
    </div>
  );
}
