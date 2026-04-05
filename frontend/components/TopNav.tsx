"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMode } from "../context/mode";
import { LIDEX_TELEGRAM_URL, LIDEX_TWITTER_URL } from "../lib/social";
import { ModeToggle } from "./ModeToggle";
import { WalletButton } from "./WalletButton";

function NavLink({
  href,
  label,
  className = ""
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const active = !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:px-2.5 ${
        active ? "bg-[#00c896]/20 text-[#00c896]" : ""
      } ${className}`}
    >
      {label}
    </Link>
  );
}

export function TopNav() {
  const { mode } = useMode();
  const isCex = mode === "cex";
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen && !notifOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [searchOpen, notifOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    setSearchDraft("");
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  function goSearchMarkets() {
    const q = searchDraft.trim();
    setSearchOpen(false);
    setMobileOpen(false);
    router.push(q ? `/markets?q=${encodeURIComponent(q)}` : "/markets");
  }

  if (!mounted) {
    return (
      <header className="sticky top-0 z-[100] h-14 border-b border-white/[0.08] bg-[#0b0f1a]/95 backdrop-blur-md" />
    );
  }

  const navMain = (
    <>
      <NavLink href="/markets" label="Markets" />
      <NavLink href="/cex/trade" label="Trade" />
      <NavLink href="/dex/swap" label="Swap" />
      <Link
        href={isCex ? "/staking" : "/referral"}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      >
        Earn
      </Link>
    </>
  );

  const navMainMobile = (
    <>
      <NavLink className="block w-full py-2.5" href="/markets" label="Markets" />
      <NavLink className="block w-full py-2.5" href="/cex/trade" label="Trade" />
      <NavLink className="block w-full py-2.5" href="/dex/swap" label="Swap" />
      <Link
        href={isCex ? "/staking" : "/referral"}
        className="block w-full rounded-lg py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
      >
        Earn
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.08] bg-[#0b0f1a]/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-4 sm:h-14">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/90 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="text-lg leading-none">{mobileOpen ? "✕" : "☰"}</span>
          </button>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-white no-underline"
          >
            <img src="/lidex-logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
            <span className="hidden font-bold tracking-tight sm:inline">Lidex</span>
          </Link>

          <nav className="ml-1 hidden items-center gap-0.5 md:flex lg:ml-3">{navMain}</nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            title="Search markets"
            aria-label="Search markets"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-white/20 hover:text-white"
            onClick={() => {
              setNotifOpen(false);
              setSearchOpen(true);
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            type="button"
            title="Notifications"
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={notifOpen}
            className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-white/20 hover:text-white sm:flex"
            onClick={() => {
              setSearchOpen(false);
              setNotifOpen(true);
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>

          <div className="[&_button]:!min-h-0 [&_button]:!py-1.5">
            <WalletButton />
          </div>
          <ModeToggle />
        </div>
      </div>

      {mobileOpen ? (
        <div className="max-h-[min(70vh,calc(100dvh-3.5rem))] overflow-y-auto border-t border-white/[0.08] bg-[#0d121f] md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Quick</p>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                className="w-full rounded-lg py-2.5 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                onClick={() => {
                  setMobileOpen(false);
                  setNotifOpen(false);
                  setSearchOpen(true);
                }}
              >
                Search markets
              </button>
              <button
                type="button"
                className="w-full rounded-lg py-2.5 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(false);
                  setNotifOpen(true);
                }}
              >
                Notifications
              </button>
            </div>
            <p className="mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Main</p>
            <div className="flex flex-col gap-0.5">{navMainMobile}</div>
          </div>
        </div>
      ) : null}

      {searchOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 p-4 pt-[max(1rem,8vh)] backdrop-blur-sm"
          role="presentation"
          onClick={() => setSearchOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-search-title"
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d121f] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="nav-search-title" className="text-lg font-semibold text-white">
              Search markets
            </h2>
            <p className="mt-1 text-sm text-white/55">Find pairs by symbol or name (e.g. ETH, BTC/USDT).</p>
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                goSearchMarkets();
              }}
            >
              <input
                ref={searchInputRef}
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Search…"
                className="min-h-11 flex-1 rounded-xl border border-white/12 bg-white/[0.06] px-3 text-sm text-white placeholder:text-white/35 focus:border-[#00c896]/50 focus:outline-none focus:ring-1 focus:ring-[#00c896]/40"
                autoComplete="off"
              />
              <button
                type="submit"
                className="min-h-11 shrink-0 rounded-xl bg-[#00c896] px-5 text-sm font-semibold text-[#04120c] transition-opacity hover:opacity-90"
              >
                Go
              </button>
            </form>
            <button
              type="button"
              className="mt-4 text-sm text-white/50 hover:text-white/80"
              onClick={() => setSearchOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {notifOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 p-4 pt-[max(1rem,8vh)] backdrop-blur-sm"
          role="presentation"
          onClick={() => setNotifOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-notif-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d121f] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="nav-notif-title" className="text-lg font-semibold text-white">
              Notifications
            </h2>
            <p className="mt-3 text-sm text-white/60">You&apos;re all caught up — no new alerts right now.</p>
            <p className="mt-2 text-sm text-white/45">
              Manage email and push preferences in{" "}
              <Link href="/settings" className="text-[#2979ff] hover:underline" onClick={() => setNotifOpen(false)}>
                Settings
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.08] pt-4">
              <a
                href={LIDEX_TWITTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#2979ff] hover:underline"
              >
                Twitter / X
              </a>
              <a
                href={LIDEX_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[#2979ff] hover:underline"
              >
                Telegram
              </a>
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-white/12 py-2.5 text-sm font-medium text-white/85 hover:bg-white/[0.06]"
              onClick={() => setNotifOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
