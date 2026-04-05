"use client";

import Link from "next/link";
import React from "react";

const TABS = [
  { id: "express", label: "Express" },
  { id: "trading", label: "P2P Trading" },
  { id: "ads", label: "Your Ads" },
  { id: "create", label: "Create Ad" }
] as const;

export type P2PTabId = (typeof TABS)[number]["id"];

export function P2PNav({ active }: { active: P2PTabId }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-[#0B0F1A] p-1">
        {TABS.map((t) => {
          const on = active === t.id;
          const cleanHref = `/p2p?tab=${t.id}`;
          return (
            <Link
              key={t.id}
              href={cleanHref}
              className={`rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                on ? "bg-[#00c896]/20 text-[#b8f5e0]" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end sm:text-sm">
        <Link href="/p2p/payment-methods" className="rounded-lg px-2 py-1.5 text-white/75 hover:bg-white/10 hover:text-white">
          Payment Methods
        </Link>
        <span className="text-white/25">|</span>
        <Link href="/p2p/merchant" className="rounded-lg px-2 py-1.5 text-white/75 hover:bg-white/10 hover:text-white">
          Become Merchant
        </Link>
        <span className="text-white/25">|</span>
        <Link href="/p2p/faq" className="rounded-lg px-2 py-1.5 text-white/75 hover:bg-white/10 hover:text-white">
          FAQs
        </Link>
        <span className="text-white/25">|</span>
        <Link href="/p2p/orders" className="rounded-lg px-2 py-1.5 text-white/75 hover:bg-white/10 hover:text-white">
          My orders
        </Link>
      </div>
    </div>
  );
}
