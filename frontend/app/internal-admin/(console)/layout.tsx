import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { logoutInternalAdmin } from "../actions";

const linkStyle: CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: 13,
  background: "rgba(255,255,255,0.06)"
};

export default function InternalAdminConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#070a12", color: "#e8eaef" }}>
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "12px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 800, marginRight: 8 }}>Lidex internal admin</span>
          <Link href="/internal-admin" style={linkStyle}>
            Home
          </Link>
          <Link href="/internal-admin/listings" style={linkStyle}>
            Listings
          </Link>
          <Link href="/internal-admin/dex-pairs" style={linkStyle}>
            DEX pairs
          </Link>
          <Link href="/internal-admin/launchpad" style={linkStyle}>
            Launchpad
          </Link>
          <Link href="/internal-admin/liq-mining" style={linkStyle}>
            Liq mining
          </Link>
          <Link href="/internal-admin/governance" style={linkStyle}>
            Governance
          </Link>
          <Link href="/internal-admin/audit-logs" style={linkStyle}>
            Audit log
          </Link>
        </div>
        <form action={logoutInternalAdmin}>
          <button
            type="submit"
            style={{
              ...linkStyle,
              border: "1px solid rgba(255,100,100,0.25)",
              cursor: "pointer",
              background: "rgba(255,80,80,0.12)"
            }}
          >
            Log out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
