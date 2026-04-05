import type { ReactNode } from "react";
import Link from "next/link";
import { logoutInternalAdmin } from "../actions";

const navLinkClass =
  "rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[13px] font-medium text-white/90 no-underline transition-colors hover:border-white/18 hover:bg-white/10";

export default function InternalAdminConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#070a12] text-[#e8eaef]">
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/[0.08] bg-[#0b0f1a]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-extrabold tracking-tight text-white">Lidex internal admin</span>
          <Link href="/internal-admin" className={navLinkClass}>
            Home
          </Link>
          <Link href="/internal-admin/listings" className={navLinkClass}>
            Listings
          </Link>
          <Link href="/internal-admin/dex-pairs" className={navLinkClass}>
            DEX pairs
          </Link>
          <Link href="/internal-admin/launchpad" className={navLinkClass}>
            Launchpad
          </Link>
          <Link href="/internal-admin/liq-mining" className={navLinkClass}>
            Liq mining
          </Link>
          <Link href="/internal-admin/governance" className={navLinkClass}>
            Governance
          </Link>
          <Link href="/internal-admin/audit-logs" className={navLinkClass}>
            Audit log
          </Link>
        </div>
        <form action={logoutInternalAdmin}>
          <button
            type="submit"
            className={`${navLinkClass} cursor-pointer border-red-400/25 bg-red-500/10 text-red-100 hover:border-red-400/40 hover:bg-red-500/15`}
          >
            Log out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
