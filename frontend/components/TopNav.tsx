"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "../context/mode";
import { ModeToggle } from "./ModeToggle";
import { WalletButton } from "./WalletButton";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      style={{
        color: "white",
        textDecoration: "none",
        padding: "8px 10px",
        borderRadius: 10,
        background: active ? "rgba(0, 200, 150, 0.18)" : "transparent"
      }}
    >
      {label}
    </Link>
  );
}

export function TopNav() {
  const { mode } = useMode();
  const isCex = mode === "cex";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(8px)",
        background: "rgba(11, 15, 26, 0.8)",
        borderBottom: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 18px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "white", textDecoration: "none", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/lidex-logo.png"
              alt="Lidex"
              width={28}
              height={28}
              style={{ borderRadius: 999, display: "block" }}
            />
            <span>Lidex</span>
          </Link>
          {isCex && <NavLink href="/cex/trade" label="Trade" />}
          <NavLink href="/dex/swap" label="Swap" />
          <NavLink href="/markets" label="Markets" />
          <NavLink href="/wallet" label="Wallet" />
          <NavLink href="/referral" label="Referral" />
          <NavLink href="/presale" label="LDX" />
          <NavLink href="/listings/apply" label="List token" />
          {isCex && <NavLink href="/staking" label="Staking" />}
          {isCex && <NavLink href="/launchpad" label="Launchpad" />}
          {isCex && <NavLink href="/governance" label="Governance" />}
          {isCex && <NavLink href="/margin" label="Margin" />}
          <NavLink href="/settings" label="Settings" />
          <NavLink href="/docs" label="Docs" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <WalletButton />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

