"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const NAV = [
  { href: "/m", label: "Home", match: (p: string) => p === "/m" || p === "/m/" },
  { href: "/m/markets", label: "Markets", match: (p: string) => p.startsWith("/m/markets") },
  { href: "/m/trade", label: "Trade", match: (p: string) => p.startsWith("/m/trade") },
  { href: "/m/swap", label: "Swap", match: (p: string) => p.startsWith("/m/swap") },
  { href: "/m/wallet", label: "Wallet", match: (p: string) => p.startsWith("/m/wallet") }
] as const;

function Icon({ name, active }: { name: (typeof NAV)[number]["label"]; active: boolean }) {
  const c = active ? "text-[#00c896]" : "text-white/50";
  const stroke = "currentColor";
  const common = { className: `h-5 w-5 ${c}`, fill: "none", stroke, strokeWidth: 1.8, viewBox: "0 0 24 24" as const };
  switch (name) {
    case "Home":
      return (
        <svg {...common}>
          <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Markets":
      return (
        <svg {...common}>
          <path d="M4 19V5M9 19V9M14 19v-6M19 19V11" strokeLinecap="round" />
        </svg>
      );
    case "Trade":
      return (
        <svg {...common}>
          <path d="M3 17h4l3-8 4 14 3-10h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Swap":
      return (
        <svg {...common}>
          <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "Wallet":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M3 10h18M16 14h2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function MobileBottomNav() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0b0f1a]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1 transition ${
                active ? "text-[#00c896]" : "text-white/55 hover:text-white/80"
              }`}
            >
              <Icon name={item.label} active={active} />
              <span className={`text-[10px] font-semibold ${active ? "text-[#00c896]" : "text-white/50"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
