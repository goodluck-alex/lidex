/** Shared quick-access catalog: homepage + /m mobile app (keep in sync). */

export type ServiceItem = { icon: string; label: string; href: string; title?: string };

/** First row on web homepage (compact tiles + “More”). */
export const PINNED_SERVICES: ServiceItem[] = [
  { icon: "📊", label: "Trade", href: "/cex/trade" },
  { icon: "⇄", label: "Swap", href: "/dex/swap" },
  { icon: "👛", label: "Wallet", href: "/wallet" },
  { icon: "📈", label: "Markets", href: "/markets" },
  { icon: "🌾", label: "Staking", href: "/staking" },
  { icon: "🚀", label: "Launchpad", href: "/launchpad" },
  {
    icon: "🏆",
    label: "Ambassador",
    href: "/ambassador",
    title: "Join Lidex Ambassador Program — Earn Rewards & Build Community"
  },
  { icon: "🎁", label: "Referral", href: "/referral" }
];

/** Full catalog when user taps “More” (same on web and mobile). */
export const SERVICE_GROUPS: { category: string; items: ServiceItem[] }[] = [
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
      {
        icon: "🏆",
        label: "Ambassador",
        href: "/ambassador",
        title: "Join Lidex Ambassador Program — Earn Rewards & Build Community"
      },
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
      { icon: "🤝", label: "P2P", href: "/p2p" }
    ]
  }
];

/** Mobile pinned row: same labels/order as web, but hub links for trade/swap/wallet/markets. */
export function pinnedServicesForMobileApp(): ServiceItem[] {
  return PINNED_SERVICES.map((s) => {
    if (s.href === "/cex/trade") return { ...s, href: "/m/trade" };
    if (s.href === "/dex/swap") return { ...s, href: "/m/swap" };
    if (s.href === "/wallet") return { ...s, href: "/m/wallet" };
    if (s.href === "/markets") return { ...s, href: "/m/markets" };
    return s;
  });
}
