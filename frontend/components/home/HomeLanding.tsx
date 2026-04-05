"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMode } from "../../context/mode";
import { setRefCode } from "../../wallet/referral";
import { LIDEX_TELEGRAM_URL, LIDEX_TWITTER_URL } from "../../lib/social";

/** Normalized row from the homepage markets API (USD quote). */
export type MarketOverviewRow = {
  coinId: string;
  name: string;
  image: string | null;
  baseSymbol: string;
  symbol: string;
  price: number;
  change24hPct: number;
  volume24hQuote: number;
  marketCap: number | null;
  marketCapRank: number | null;
};

type OverviewTab = "hot" | "gainers" | "losers" | "new" | "volume";

function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1000 ? n.toFixed(2) : n >= 10 ? n.toFixed(4) : n.toFixed(6);
}
function fmtChangePct(n: number | null | undefined) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
function fmtVol(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

type ServiceItem = { icon: string; label: string; href: string };

/** First row: compact tiles + “More” expands full catalog (Binance-style). */
const PINNED_SERVICES: ServiceItem[] = [
  { icon: "📊", label: "Trade", href: "/cex/trade" },
  { icon: "⇄", label: "Swap", href: "/dex/swap" },
  { icon: "👛", label: "Wallet", href: "/wallet" },
  { icon: "📈", label: "Markets", href: "/markets" },
  { icon: "🌾", label: "Staking", href: "/staking" },
  { icon: "🚀", label: "Launchpad", href: "/launchpad" },
  { icon: "🎁", label: "Referral", href: "/referral" }
];

const SERVICE_GROUPS: { category: string; items: ServiceItem[] }[] = [
  {
    category: "General",
    items: [
      { icon: "📰", label: "News", href: "/docs" },
      { icon: "📈", label: "Markets", href: "/markets" },
      { icon: "📄", label: "Docs", href: "/docs" }
    ]
  },
  {
    category: "Trade",
    items: [
      { icon: "📊", label: "Trade", href: "/cex/trade" },
      { icon: "⇄", label: "Swap", href: "/dex/swap" },
      { icon: "⚡", label: "Margin", href: "/margin" }
    ]
  },
  {
    category: "Earn",
    items: [
      { icon: "🌾", label: "Staking", href: "/staking" },
      { icon: "🎁", label: "Referral", href: "/referral" },
      { icon: "🚀", label: "Launchpad", href: "/launchpad" },
      { icon: "🪙", label: "LDX", href: "/presale" }
    ]
  },
  {
    category: "Wallet",
    items: [
      { icon: "👛", label: "Wallet", href: "/wallet" },
      { icon: "📥", label: "Deposit", href: "/wallet" },
      { icon: "📤", label: "Withdraw", href: "/wallet" },
      { icon: "🔁", label: "Transfer", href: "/wallet" }
    ]
  },
  {
    category: "Listings",
    items: [{ icon: "📝", label: "List token", href: "/listings/apply" }]
  },
  {
    category: "Account",
    items: [{ icon: "⚙️", label: "Settings", href: "/settings" }]
  },
  {
    category: "Platform",
    items: [
      { icon: "🏛️", label: "Governance", href: "/governance" },
      { icon: "🤝", label: "P2P", href: "/docs" }
    ]
  }
];

const compactTileClass =
  "group flex min-h-[4rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-1 py-1.5 text-center transition hover:border-[#f0b90b]/40 hover:bg-white/[0.07] sm:min-h-[4.25rem] sm:py-2";
const compactIconClass = "text-base leading-none sm:text-lg";
const compactLabelClass = "max-w-[4.5rem] text-[10px] font-semibold leading-tight text-white sm:max-w-none sm:text-xs";

/** Shown when the live news feed is unavailable. */
const FALLBACK_NEWS: { tag: string; title: string; desc: string; href: string }[] = [
  {
    tag: "Lidex Updates",
    title: "Hybrid DEX + CEX roadmap",
    desc: "Switch modes anytime — same account, one platform.",
    href: "/docs"
  },
  {
    tag: "Announcements",
    title: "LDX ecosystem & listings",
    desc: "Token applications, markets, and pair activations.",
    href: "/listings/apply"
  },
  {
    tag: "Crypto News",
    title: "Stay informed",
    desc: "Follow markets and volatility from the Markets page.",
    href: "/markets"
  },
  {
    tag: "Lidex Updates",
    title: "Wallet & security",
    desc: "Non-custodial swaps via 0x; CEX features when you choose Full mode.",
    href: "/wallet"
  }
];

type NewsFeedItem = {
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  image: string | null;
};

function fmtNewsDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const NEWS_CAROUSEL_AUTO_MS = 6500;

/** One slide at a time; smooth horizontal translate; prev/next + dots; optional autoplay. */
function SlideCarousel({
  slides,
  resetKey,
  autoPlayMs = NEWS_CAROUSEL_AUTO_MS
}: {
  slides: React.ReactNode[];
  resetKey: string;
  autoPlayMs?: number;
}) {
  const n = slides.length;
  const [i, setI] = useState(0);
  const pausedRef = useRef(false);

  const prev = useCallback(() => {
    setI((x) => (x - 1 + n) % n);
  }, [n]);

  const next = useCallback(() => {
    setI((x) => (x + 1) % n);
  }, [n]);

  useEffect(() => {
    setI(0);
  }, [resetKey]);

  useEffect(() => {
    if (n <= 1 || autoPlayMs <= 0) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current) next();
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [n, autoPlayMs, next]);

  if (n === 0) return null;

  return (
    <div
      className="relative px-10 sm:px-12"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex duration-[450ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:duration-0"
          style={{
            width: `${n * 100}%`,
            transform: `translateX(-${(i / n) * 100}%)`
          }}
        >
          {slides.map((slide, idx) => (
            <div key={idx} className="box-border shrink-0 px-0 sm:px-1" style={{ width: `${100 / n}%` }}>
              {slide}
            </div>
          ))}
        </div>
      </div>
      {n > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-xl leading-none text-white shadow-lg backdrop-blur-sm transition hover:border-[#2979ff]/45 hover:bg-black/75 sm:left-1"
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-xl leading-none text-white shadow-lg backdrop-blur-sm transition hover:border-[#2979ff]/45 hover:bg-black/75 sm:right-1"
            aria-label="Next slide"
          >
            ›
          </button>
          <div className="mt-4 flex justify-center gap-1.5" role="tablist" aria-label="Slides">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === i}
                aria-label={`Slide ${idx + 1} of ${n}`}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? "w-6 bg-[#00c896]" : "w-1.5 bg-white/25 hover:bg-white/45"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Hero strip: rotating announcements (fade in / out, one at a time) */
const ANNOUNCEMENT_SLIDES: { tag: string; title: string; desc: string; href: string }[] = [
  {
    tag: "Platform",
    title: "DEX & CEX in one place",
    desc: "Use DEX Lite for swaps or switch to CEX Full for order books, staking, and launchpad — toggle anytime in the header.",
    href: "/docs"
  },
  {
    tag: "Listings",
    title: "Apply to list your token",
    desc: "Submit a listing request and grow with the LDX ecosystem.",
    href: "/listings/apply"
  },
  {
    tag: "Markets",
    title: "Live pairs & volume",
    desc: "Track prices, 24h change, and liquidity across supported markets.",
    href: "/markets"
  },
  {
    tag: "Security",
    title: "Wallet & custody options",
    desc: "Non-custodial swaps where supported; custodial features when you choose Full mode.",
    href: "/wallet"
  },
  {
    tag: "Community",
    title: "Follow Lidex for updates",
    desc: "Announcements, launches, and roadmap news on our channels.",
    href: "/docs"
  }
];

const ANNOUNCE_HOLD_MS = 5200;
const ANNOUNCE_FADE_MS = 500;

function AnnouncementRotator() {
  const slides = ANNOUNCEMENT_SLIDES;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      setVisible(false);
      fadeTimerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % slides.length);
        setVisible(true);
      }, ANNOUNCE_FADE_MS);
    };
    const interval = setInterval(tick, ANNOUNCE_HOLD_MS);
    return () => {
      clearInterval(interval);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [slides.length]);

  const slide = slides[index]!;

  return (
    <section className="border-b border-white/[0.06] bg-[#0d121f]/90 py-4 sm:py-5" aria-label="Announcements">
      <div className="mx-auto max-w-7xl px-4">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:text-[11px]">
          Announcements &amp; updates
        </p>
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-[#2979ff]/10 via-white/[0.04] to-[#00c896]/10 px-4 py-4 shadow-lg shadow-black/20 sm:px-8 sm:py-5">
          <div
            className={`min-h-[5.25rem] transition-opacity duration-500 ease-in-out sm:min-h-[4.75rem] ${visible ? "opacity-100" : "opacity-0"}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="mb-1.5 inline-block rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00c896] sm:text-xs">
              {slide.tag}
            </span>
            <h3 className="text-base font-bold leading-snug text-white sm:text-lg">{slide.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/65">{slide.desc}</p>
            <Link href={slide.href} className="mt-2.5 inline-block text-sm font-semibold text-[#2979ff] hover:text-[#5c9dff] hover:underline">
              Learn more →
            </Link>
          </div>
          <div className="mt-4 flex justify-center gap-1.5 sm:mt-3" role="tablist" aria-label="Announcement slides">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Announcement ${i + 1} of ${slides.length}`}
                onClick={() => {
                  if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
                  setIndex(i);
                  setVisible(true);
                }}
                className={`h-1 rounded-full transition-all duration-300 ${i === index ? "w-7 bg-[#00c896]" : "w-1.5 bg-white/25 hover:bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeLanding() {
  const router = useRouter();
  const { setMode } = useMode();
  const [marketRows, setMarketRows] = useState<MarketOverviewRow[]>([]);
  const [mktError, setMktError] = useState<string | null>(null);
  const [mktLoading, setMktLoading] = useState(true);
  const [tab, setTab] = useState<OverviewTab>("hot");
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsFeedItem[]>([]);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const ref = u.searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMktError(null);
        setMktLoading(true);
        const res = await fetch("/api/markets/coingecko");
        const data = (await res.json()) as
          | { ok: true; items: MarketOverviewRow[] }
          | { ok: false; error?: string; detail?: string };
        if (cancelled) return;
        if (!data.ok) {
          setMarketRows([]);
          setMktError(data.error || "Failed to load markets");
          return;
        }
        setMarketRows(data.items);
      } catch (e) {
        if (cancelled) return;
        setMarketRows([]);
        setMktError(e instanceof Error ? e.message : "Failed to load markets");
      } finally {
        if (!cancelled) setMktLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setNewsError(null);
        setNewsLoading(true);
        const res = await fetch("/api/news/feed");
        const data = (await res.json()) as
          | { ok: true; items: NewsFeedItem[] }
          | { ok: false; error?: string };
        if (cancelled) return;
        if (!data.ok || !Array.isArray(data.items) || data.items.length === 0) {
          setNewsItems([]);
          setNewsError(data.ok === false ? data.error || "News unavailable" : "No articles");
          return;
        }
        setNewsItems(data.items);
      } catch (e) {
        if (cancelled) return;
        setNewsItems([]);
        setNewsError(e instanceof Error ? e.message : "Failed to load news");
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tableRows = useMemo(() => {
    const base = [...marketRows];
    switch (tab) {
      case "gainers":
        return base.sort((a, b) => b.change24hPct - a.change24hPct);
      case "losers":
        return base.sort((a, b) => a.change24hPct - b.change24hPct);
      case "volume":
        return base.sort((a, b) => b.volume24hQuote - a.volume24hQuote);
      case "new":
        return [...base]
          .filter((r) => r.marketCap != null && r.marketCap > 0)
          .sort((a, b) => (a.marketCap ?? 0) - (b.marketCap ?? 0));
      case "hot":
      default:
        return base.sort((a, b) => b.volume24hQuote - a.volume24hQuote);
    }
  }, [marketRows, tab]);

  const popularCards = useMemo(() => {
    const list = [...marketRows];
    const wantedSyms = ["BTC", "ETH", "BNB"];
    const byVol = [...list].sort((a, b) => b.volume24hQuote - a.volume24hQuote);
    const picked: MarketOverviewRow[] = [];
    for (const sym of wantedSyms) {
      const row = list.find((r) => r.baseSymbol === sym);
      if (row) picked.push(row);
    }
    const primary: MarketOverviewRow[] = [...picked];
    for (const r of byVol) {
      if (primary.length >= 4) break;
      if (!primary.some((p) => p.coinId === r.coinId)) primary.push(r);
    }
    const finalPrimary = primary.length ? primary : byVol.slice(0, 4);
    const movers = [...list].sort((a, b) => Math.abs(b.change24hPct) - Math.abs(a.change24hPct)).slice(0, 4);
    return { primary: finalPrimary, movers };
  }, [marketRows]);

  const tabs: { id: OverviewTab; label: string }[] = [
    { id: "hot", label: "Hot" },
    { id: "gainers", label: "Gainers" },
    { id: "losers", label: "Losers" },
    { id: "new", label: "New" },
    { id: "volume", label: "Volume" }
  ];

  return (
    <main className="min-h-screen bg-[#0b0f1a] pb-16 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_20%,rgba(41,121,255,0.25),transparent),radial-gradient(ellipse_60%_50%_at_80%_10%,rgba(0,200,150,0.18),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 md:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Trade Crypto Seamlessly with{" "}
              <span className="bg-gradient-to-r from-[#2979ff] to-[#00c896] bg-clip-text text-transparent">Lidex Exchange</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/70 sm:text-lg">
              Switch between DEX &amp; CEX in one powerful platform
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode("dex");
                  router.push("/dex/swap");
                }}
                className="rounded-xl bg-[#00c896] px-6 py-3 text-sm font-bold text-[#0b0f1a] shadow-lg shadow-[#00c896]/20 transition hover:bg-[#00e0a8]"
              >
                DEX
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("cex");
                  router.push("/cex/trade");
                }}
                className="rounded-xl border border-[#2979ff]/50 bg-[#2979ff]/15 px-6 py-3 text-sm font-bold text-white transition hover:bg-[#2979ff]/25"
              >
                CEX
              </button>
            </div>
          </div>
        </div>
      </section>

      <AnnouncementRotator />

      {/* Quick access — compact row; “More” expands full service grid (exchange-style) */}
      <section id="more-services" className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-bold text-white sm:text-xl">Quick access</h2>
          {servicesExpanded ? (
            <button
              type="button"
              onClick={() => setServicesExpanded(false)}
              className="text-sm font-semibold text-[#2979ff] hover:text-[#5c9dff] hover:underline"
            >
              Show less
            </button>
          ) : null}
        </div>

        {!servicesExpanded ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-8">
            {PINNED_SERVICES.map((f) => (
              <Link key={f.href + f.label} href={f.href} className={compactTileClass}>
                <span className={compactIconClass} aria-hidden>
                  {f.icon}
                </span>
                <span className={compactLabelClass}>{f.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setServicesExpanded(true)}
              className={`${compactTileClass} cursor-pointer border-dashed border-white/20 hover:border-[#f0b90b]/50`}
              aria-expanded={false}
            >
              <span className={`${compactIconClass} text-[#f0b90b]`} aria-hidden>
                ⋯
              </span>
              <span className={compactLabelClass}>More</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {SERVICE_GROUPS.map((g) => (
              <div key={g.category}>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/45">{g.category}</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                  {g.items.map((f) => (
                    <Link key={`${g.category}-${f.href}-${f.label}`} href={f.href} className={compactTileClass}>
                      <span className={compactIconClass} aria-hidden>
                        {f.icon}
                      </span>
                      <span className={compactLabelClass}>{f.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Market overview */}
      <section className="border-y border-white/[0.06] bg-[#0d121f]/50 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Market overview</h2>
              <p className="mt-1 text-xs text-white/45">Live USD snapshot · reference data</p>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold sm:text-sm ${
                    tab === t.id ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/20">
            {mktLoading ? (
              <p className="p-8 text-center text-sm text-white/50">Loading market data…</p>
            ) : mktError ? (
              <p className="p-4 text-sm text-red-300/90">{mktError}</p>
            ) : (
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wide text-white/45">
                    <th className="px-4 py-3 font-semibold">Coin</th>
                    <th className="px-4 py-3 font-semibold">Price (USD)</th>
                    <th className="px-4 py-3 font-semibold">24h Change</th>
                    <th className="px-4 py-3 font-semibold">Volume (24h)</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.slice(0, 12).map((row) => {
                    const up = row.change24hPct >= 0;
                    return (
                      <tr
                        key={row.coinId}
                        className="border-b border-white/[0.04] transition hover:bg-white/[0.04]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {row.image ? (
                              <img
                                src={row.image}
                                alt=""
                                width={28}
                                height={28}
                                className="h-7 w-7 shrink-0 rounded-full"
                              />
                            ) : (
                              <div className="h-7 w-7 shrink-0 rounded-full bg-white/10" aria-hidden />
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold leading-tight">
                                {row.baseSymbol}
                                <span className="text-white/40">/USD</span>
                              </div>
                              <div className="truncate text-[11px] text-white/45">{row.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{fmtPrice(row.price)}</td>
                        <td className={`px-4 py-3 font-semibold tabular-nums ${up ? "text-[#00c896]" : "text-red-400"}`}>
                          {fmtChangePct(row.change24hPct)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-white/80">{fmtVol(row.volume24hQuote)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-white/40">
            Reference snapshot, not Lidex order-book prices. For listed pairs, see{" "}
            <Link href="/markets" className="text-[#2979ff] hover:underline">
              Markets
            </Link>
            .
          </p>
          <div className="mt-2 text-right">
            <Link href="/markets" className="text-sm font-semibold text-[#2979ff] hover:underline">
              View Lidex markets →
            </Link>
          </div>
        </div>
      </section>

      {/* Popular + top movers */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
        <h2 className="text-lg font-bold sm:text-xl">Popular markets</h2>
        <p className="mb-6 mt-1 text-xs text-white/45">Spot reference prices (USD)</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularCards.primary.map((s) => {
            const up = s.change24hPct >= 0;
            return (
              <Link
                key={s.coinId}
                href="/markets"
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-card transition hover:border-[#2979ff]/40 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {s.image ? (
                      <img src={s.image} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full" />
                    ) : null}
                    <span className="truncate font-bold">
                      {s.baseSymbol}
                      <span className="text-white/45">/USD</span>
                    </span>
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${up ? "text-[#00c896]" : "text-red-400"}`}>
                    {fmtChangePct(s.change24hPct)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/50">Reference price</p>
                <p className="text-lg font-bold tabular-nums">{fmtPrice(s.price)}</p>
                <p className="mt-1 text-xs text-white/50">24h Vol {fmtVol(s.volume24hQuote)}</p>
              </Link>
            );
          })}
        </div>

        <h3 className="mb-4 mt-10 text-base font-bold text-white/90">Top movers</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularCards.movers.map((s) => {
            const up = s.change24hPct >= 0;
            return (
              <div
                key={`m-${s.coinId}`}
                className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {s.image ? (
                      <img src={s.image} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full" />
                    ) : null}
                    <span className="truncate font-bold">
                      {s.baseSymbol}
                      <span className="text-white/45">/USD</span>
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${up ? "bg-[#00c896]/20 text-[#00c896]" : "bg-red-500/20 text-red-300"}`}
                  >
                    {fmtChangePct(s.change24hPct)}
                  </span>
                </div>
                <p className="mt-2 text-sm tabular-nums text-white/80">{fmtPrice(s.price)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lidex news (third-party RSS server-side only; no outlet branding in UI) */}
      <section className="border-t border-white/[0.06] bg-[#0d121f]/40 py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6">
            <h2 className="text-lg font-bold sm:text-xl">Lidex news</h2>
            {newsItems.length > 0 && !newsLoading ? (
              <p className="mt-1 text-xs text-white/45">Curated headlines · full articles open in a new tab</p>
            ) : null}
          </div>
          {newsLoading ? (
            <p className="text-sm text-white/50">Loading headlines…</p>
          ) : newsItems.length > 0 ? (
            <SlideCarousel
              resetKey={newsItems.map((n) => n.link).join("|")}
              slides={newsItems.map((n, i) => (
                <a
                  key={`${n.link}-${i}`}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[8.5rem] gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-[#2979ff]/35 hover:bg-white/[0.05] sm:min-h-[7.5rem] sm:p-5"
                >
                  {n.image ? (
                    <div className="relative hidden h-24 w-28 shrink-0 overflow-hidden rounded-lg border border-white/[0.06] sm:block">
                      <img src={n.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#00c896]">Lidex news</span>
                    <h3 className="mt-1 line-clamp-3 text-base font-bold group-hover:text-[#7aa7ff] sm:line-clamp-2">{n.title}</h3>
                    {fmtNewsDate(n.publishedAt) ? (
                      <p className="mt-1 text-[11px] text-white/40">{fmtNewsDate(n.publishedAt)}</p>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm text-white/60">{n.summary}</p>
                  </div>
                </a>
              ))}
            />
          ) : (
            <>
              {newsError ? (
                <p className="mb-4 text-sm text-amber-200/80">{newsError} — showing Lidex updates below.</p>
              ) : null}
              <SlideCarousel
                resetKey="fallback"
                slides={FALLBACK_NEWS.map((n, i) => (
                  <Link
                    key={i}
                    href={n.href}
                    className="group block min-h-[8.5rem] rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-[#2979ff]/35 hover:bg-white/[0.05] sm:min-h-[7.5rem]"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#00c896]">{n.tag}</span>
                    <h3 className="mt-2 text-base font-bold group-hover:text-[#7aa7ff]">{n.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-white/60">{n.desc}</p>
                  </Link>
                ))}
              />
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#080b14] py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-3">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Company</p>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/docs" className="hover:text-[#00c896]">
                  About
                </Link>
              </li>
              <li>
                <span className="cursor-not-allowed opacity-50">Careers</span>
              </li>
              <li>
                <Link href="/docs" className="hover:text-[#00c896]">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Support</p>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/docs" className="hover:text-[#00c896]">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-[#00c896]">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Socials</p>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href={LIDEX_TWITTER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#2979ff]">
                  Twitter
                </a>
              </li>
              <li>
                <a href={LIDEX_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#2979ff]">
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/[0.06] px-4 pt-8 text-center text-xs text-white/45">
          © {new Date().getFullYear()} Lidex. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
