"use client";

import React, { useMemo } from "react";
import { useMarketOverview } from "../../hooks/useMarketOverview";
import { MobileMarketTabsList } from "./MobileMarketTabsList";
import { MobilePromoCarousel, type PromoSlide } from "./MobilePromoCarousel";
import { MobileQuickAccessGrid } from "./MobileQuickAccessGrid";
import { MobileStickyHeader } from "./MobileStickyHeader";
import { ANDROID_APK_URL } from "../../lib/siteUrls";

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "android-apk",
    tag: "Release",
    title: "Android app now available",
    desc: "Download the latest Lidex Android APK and install it on your phone.",
    href: ANDROID_APK_URL,
    accent: "green"
  },
  {
    id: "1",
    tag: "Launchpad",
    title: "New token sales",
    desc: "Discover projects and participate when sales go live.",
    href: "/launchpad",
    accent: "green"
  },
  {
    id: "2",
    tag: "Airdrops",
    title: "Referral rewards",
    desc: "Invite friends and grow your network on Lidex.",
    href: "/referral",
    accent: "blue"
  },
  {
    id: "3",
    tag: "Platform",
    title: "Lite & full trading",
    desc: "Swap in lite mode or switch to full mode for order books and more.",
    href: "/docs",
    accent: "green"
  },
  {
    id: "4",
    tag: "P2P",
    title: "Peer-to-peer",
    desc: "Trade fiat and crypto with other users — ads, orders, and chat.",
    href: "/p2p",
    accent: "blue"
  }
];

export function MobileHomeScreen() {
  const { rows, error, loading, sortedForTab } = useMarketOverview();

  const topVolumeIds = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.volume24hQuote - a.volume24hQuote);
    return new Set(sorted.slice(0, 5).map((r) => r.coinId));
  }, [rows]);

  return (
    <div className="min-h-dvh bg-[#0b0f1a] pb-24 text-white">
      <MobileStickyHeader marketRows={rows} />
      <p className="px-3 pt-2 text-center text-[11px] font-medium text-white/50">Trade Freely. Trade Powerfully.</p>
      <MobilePromoCarousel slides={PROMO_SLIDES} />
      <MobileQuickAccessGrid />
      <MobileMarketTabsList loading={loading} error={error} sortedForTab={sortedForTab} topVolumeIds={topVolumeIds} />
    </div>
  );
}
