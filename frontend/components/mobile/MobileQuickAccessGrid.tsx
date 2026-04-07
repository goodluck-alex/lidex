"use client";

import Link from "next/link";
import React from "react";

const ITEMS: { icon: string; label: string; href: string }[] = [
  { icon: "📊", label: "Trade", href: "/m/trade" },
  { icon: "⇄", label: "Swap", href: "/m/swap" },
  { icon: "👛", label: "Wallet", href: "/m/wallet" },
  { icon: "📈", label: "Markets", href: "/m/markets" },
  { icon: "🌾", label: "Staking", href: "/staking" },
  { icon: "🚀", label: "Launchpad", href: "/launchpad" },
  { icon: "🎁", label: "Referral", href: "/referral" },
  { icon: "🤝", label: "P2P", href: "/p2p" }
];

const tile =
  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-center shadow-md shadow-black/20 transition active:scale-[0.98] hover:border-[#00c896]/35 hover:bg-white/[0.07]";

export function MobileQuickAccessGrid() {
  return (
    <section className="px-3 py-4">
      <h2 className="mb-3 text-sm font-bold text-white/90">Quick access</h2>
      <div className="grid grid-cols-4 gap-2">
        {ITEMS.map((f) => (
          <Link key={f.href + f.label} href={f.href} className={tile}>
            <span className="text-lg leading-none" aria-hidden>
              {f.icon}
            </span>
            <span className="max-w-[4.5rem] text-[10px] font-semibold leading-tight text-white/90">{f.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
