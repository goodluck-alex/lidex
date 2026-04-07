import Link from "next/link";
import React from "react";

export const metadata = {
  title: "Lidex · Trade"
};

export default function MobileTradeHubPage() {
  return (
    <div className="min-h-dvh px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <h1 className="text-xl font-bold">Spot trading</h1>
      <p className="mt-2 text-sm text-white/60">
        Full order book, charts, and custodial trading open in the dedicated trade desk (same features as the website).
      </p>
      <Link
        href="/cex/trade"
        className="mt-6 block w-full rounded-2xl bg-[#00c896] py-4 text-center text-sm font-bold text-[#0b0f1a] shadow-lg shadow-[#00c896]/25"
      >
        Open trade desk
      </Link>
      <p className="mt-4 text-center text-xs text-white/45">Use the back gesture to return to the app home.</p>
    </div>
  );
}
