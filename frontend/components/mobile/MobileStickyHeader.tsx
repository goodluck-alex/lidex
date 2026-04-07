"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { MarketOverviewRow } from "../home/HomeLanding";
import { ModeToggle } from "../ModeToggle";
import { WalletButton } from "../WalletButton";
import { LIDEX_TELEGRAM_URL } from "../../lib/social";

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000 ? n.toFixed(2) : n >= 10 ? n.toFixed(4) : n.toFixed(6);
}

export function MobileStickyHeader({ marketRows }: { marketRows: MarketOverviewRow[] }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sheet, setSheet] = useState<"notif" | "qr" | "alerts" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen && !sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [searchOpen, sheet]);

  const filtered = useCallback(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return marketRows.slice(0, 24);
    return marketRows
      .filter(
        (r) =>
          r.baseSymbol.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.symbol.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [draft, marketRows]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0b0f1a]/92 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-2 px-3">
          <Link href="/m" className="shrink-0 rounded-xl p-1" aria-label="Lidex home">
            <Image src="/lidex-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-sm text-white/45"
          >
            Search coin pairs…
          </button>
          <div className="shrink-0 origin-right scale-[0.82]">
            <ModeToggle />
          </div>
          <div className="shrink-0 scale-90 sm:scale-100">
            <WalletButton />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 px-3">
          <button
            type="button"
            onClick={() => setSheet("qr")}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Scan QR"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 4h2v2h-2v-2zm2-4h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2z" />
            </svg>
          </button>
          <a
            href={LIDEX_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Support chat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => setSheet("notif")}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setSheet("alerts")}
            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-[#00c896] hover:bg-white/10"
          >
            Alerts
          </button>
        </div>
      </header>

      {searchOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#0b0f1a]" role="dialog" aria-label="Search markets">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="BTC, ETH, pair…"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#00c896]/50"
            />
            <button type="button" className="text-sm font-semibold text-[#7aa7ff]" onClick={() => setSearchOpen(false)}>
              Cancel
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto px-2 py-2">
            {filtered().map((r) => (
              <li key={r.coinId}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    router.push(`/markets?q=${encodeURIComponent(r.baseSymbol)}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.06]"
                >
                  {r.image ? (
                    <img src={r.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white">
                      {r.baseSymbol}
                      <span className="text-white/45"> / USD</span>
                    </div>
                    <div className="truncate text-xs text-white/50">{r.name}</div>
                  </div>
                  <div className="text-sm text-white/80">${fmtPrice(r.price)}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sheet ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4"
          role="dialog"
          onClick={() => setSheet(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121826] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              {sheet === "notif" && "Notifications"}
              {sheet === "qr" && "Scan QR"}
              {sheet === "alerts" && "Price alerts"}
            </h3>
            <p className="mt-2 text-sm text-white/65">
              {sheet === "notif" && "Push and in-app notifications will be available in a future update (Firebase + Capacitor)."}
              {sheet === "qr" && "Camera-based QR for addresses and payment requests is planned for a future release."}
              {sheet === "alerts" && "Set target prices and get notified — coming soon. Favorite coins from the list below for quick access today."}
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-[#00c896]/20 py-2.5 text-sm font-semibold text-[#b8f5e0]"
              onClick={() => setSheet(null)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
