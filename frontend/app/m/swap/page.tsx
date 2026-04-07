import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Lidex · Swap"
};

export default function MobileSwapHubPage() {
  return (
    <div className="min-h-dvh px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <h1 className="text-xl font-bold">Swap</h1>
      <p className="mt-2 text-sm text-white/60">Non-custodial swaps via 0x — same flow as lite mode on the web.</p>
      <Link
        href="/dex/swap"
        className="mt-6 block w-full rounded-2xl border border-[#00c896]/40 bg-[#00c896]/15 py-4 text-center text-sm font-bold text-[#b8f5e0]"
      >
        Open swap
      </Link>
    </div>
  );
}
