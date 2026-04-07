export type HelpCategoryId =
  | "getting-started"
  | "account-security"
  | "wallet"
  | "trading"
  | "swap"
  | "p2p"
  | "mobile"
  | "deposits-withdrawals"
  | "launchpad"
  | "notifications"
  | "fees"
  | "security"
  | "api"
  | "troubleshooting"
  | "contact-support";

export type HelpCategory = {
  id: HelpCategoryId;
  title: string;
  description: string;
  icon: string;
};

export type HelpFaq = { q: string; a: string };

export type HelpArticle = {
  category: HelpCategoryId;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  updatedAt: string; // ISO
  bodyMd: string;
  faqs?: HelpFaq[];
  /** Optional: prioritize on /help home. */
  popular?: boolean;
};

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: "getting-started", title: "Getting Started", description: "New to Lidex? Start here.", icon: "🚀" },
  { id: "account-security", title: "Account & Security", description: "Login, 2FA, and account safety.", icon: "🔐" },
  { id: "wallet", title: "Wallet", description: "Create, deposit, withdraw, and fees.", icon: "👛" },
  { id: "trading", title: "Trading", description: "Spot, orders, fees, supported tokens.", icon: "📊" },
  { id: "swap", title: "Swap Feature", description: "How swaps work, slippage, common errors.", icon: "⇄" },
  { id: "p2p", title: "P2P Trading", description: "Buy/sell, create ads, payment methods.", icon: "🤝" },
  { id: "mobile", title: "Mobile App", description: "Android APK install, updates, troubleshooting.", icon: "📱" },
  { id: "deposits-withdrawals", title: "Deposits & Withdrawals", description: "Processing time, fees, status.", icon: "🏦" },
  { id: "launchpad", title: "Launchpad", description: "Token sales and distribution flows.", icon: "🚀" },
  { id: "notifications", title: "Notifications", description: "Email and push notifications.", icon: "🔔" },
  { id: "fees", title: "Fees", description: "Trading, swap, deposit, withdrawal fees.", icon: "💸" },
  { id: "security", title: "Security", description: "Protection, best practices, 2FA.", icon: "🛡️" },
  { id: "api", title: "API", description: "API keys and security (optional).", icon: "🧩" },
  { id: "troubleshooting", title: "Troubleshooting", description: "Fix common problems quickly.", icon: "🛠️" },
  { id: "contact-support", title: "Contact Support", description: "Tickets, email, Telegram support.", icon: "💬" }
];

function md(strings: TemplateStringsArray) {
  return String.raw({ raw: strings }).trim();
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    category: "getting-started",
    slug: "what-is-lidex",
    title: "What is Lidex Exchange?",
    description: "A hybrid crypto exchange with DEX (Lite) and CEX (Full) modes.",
    keywords: ["lidex", "exchange", "dex", "cex", "lite", "full"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## Overview
Lidex is a hybrid crypto exchange that combines:

- **DEX (Lite)**: non-custodial swaps and market discovery.
- **CEX (Full)**: custodial trading surfaces like order books, staking, launchpad, and more.

## How modes work
You can switch modes from the header. Some features are only available in **Full** mode.
`
  },
  {
    category: "getting-started",
    slug: "platform-overview",
    title: "Platform overview",
    description: "Main areas: Markets, Trade, Swap, Wallet, P2P, Earn.",
    keywords: ["overview", "markets", "trade", "swap", "wallet", "p2p"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## Main navigation
- **Home**: quick access + market overview
- **Markets**: pairs, stats, charts
- **Trade** (Full): order book trading
- **Swap** (Lite): non-custodial swaps
- **Wallet**: balances + deposits/withdrawals (Full)
- **P2P**: express + marketplace + ads + orders
`
  },
  {
    category: "account-security",
    slug: "login-guide",
    title: "Login guide",
    description: "Connect your wallet and authenticate with a signature.",
    keywords: ["login", "wallet", "signature", "nonce"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## How login works
Lidex uses wallet-signature login:

1. Click **Wallet** and connect your wallet.
2. Approve the signature request to authenticate.
3. You stay signed in via a session cookie.
`
  },
  {
    category: "account-security",
    slug: "two-factor-authentication",
    title: "Two-factor authentication (2FA)",
    description: "Recommended for Full mode accounts (coming soon if not enabled).",
    keywords: ["2fa", "totp", "security"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## 2FA status
If 2FA is enabled for your deployment, you can configure it in **Settings**.

## Best practices
- Save recovery codes offline.
- Use an authenticator app (TOTP) rather than SMS.
`
  },
  {
    category: "wallet",
    slug: "deposit-crypto",
    title: "Deposit crypto",
    description: "Deposit into custodial balances (Full mode).",
    keywords: ["deposit", "wallet", "full", "cex"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## Deposit guide
1. Switch to **CEX (Full)** mode.
2. Go to **Wallet**.
3. Choose the asset and network.
4. Copy the deposit address and send funds.

## Processing time
Deposits require network confirmations before appearing.
`
  },
  {
    category: "wallet",
    slug: "withdraw-crypto",
    title: "Withdraw crypto",
    description: "Withdraw from custodial balances (Full mode).",
    keywords: ["withdraw", "wallet", "fees", "full"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Withdraw guide
1. Switch to **CEX (Full)**.
2. Go to **Wallet** and select **Withdraw**.
3. Paste destination address and choose network.
4. Confirm withdrawal and complete any security prompts.

## Common mistakes
- Wrong network selection
- Incorrect address
`
  },
  {
    category: "trading",
    slug: "spot-trading",
    title: "Spot trading",
    description: "Place market and limit orders in the Full trading desk.",
    keywords: ["spot", "trade", "orderbook", "market order", "limit order"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## Spot trading basics
Spot trading lets you buy/sell at current prices (market) or your target price (limit).

## Order types
- **Market**: executes immediately at the best available price
- **Limit**: executes at your chosen price (or better)
`
  },
  {
    category: "swap",
    slug: "how-to-swap",
    title: "How to swap tokens",
    description: "Swap in Lite mode via 0x routing.",
    keywords: ["swap", "dex", "lite", "0x", "slippage"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## Swap steps
1. Switch to **DEX (Lite)**.
2. Open **Swap**.
3. Choose token in/out and amount.
4. Review price impact + slippage.
5. Confirm in your wallet.
`
  },
  {
    category: "swap",
    slug: "swap-slippage",
    title: "Swap slippage",
    description: "What slippage is and how to set it safely.",
    keywords: ["slippage", "swap errors", "price impact"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## What is slippage?
Slippage is the maximum acceptable price movement between quote and execution.

## Recommendations
- Highly liquid pairs: low slippage
- Volatile/illiquid pairs: higher slippage may be required
`
  },
  {
    category: "p2p",
    slug: "what-is-p2p",
    title: "What is P2P?",
    description: "Peer-to-peer trading between users using ads and orders.",
    keywords: ["p2p", "ads", "orders", "merchant", "payment"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## P2P overview
P2P lets users buy/sell crypto directly with each other using payment methods.

## Key concepts
- **Ads**: offers created by users
- **Orders**: created when someone clicks Buy/Sell
- **Timer**: payment window (e.g. 15 minutes)
`
  },
  {
    category: "p2p",
    slug: "create-ads",
    title: "Create ads",
    description: "How to create buy/sell ads with limits and terms.",
    keywords: ["p2p", "create ad", "limits", "terms"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Create an ad
Go to **P2P → Create Ad** and choose:
- Buy or Sell
- Token and currency
- Fixed or market price
- Min/Max limits
- Payment method
- Time limit and optional terms
`
  },
  {
    category: "mobile",
    slug: "download-android-app",
    title: "Download Android app",
    description: "Get the Lidex Android APK and install it.",
    keywords: ["android", "apk", "download", "install"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## Android download
If you are distributing via APK:
- Download the latest signed APK from the official link.
- Enable **Install unknown apps** on your device (if needed).

## Updates
Install the newest APK over the old one to update.
`
  },
  {
    category: "deposits-withdrawals",
    slug: "processing-time",
    title: "Processing time",
    description: "How long deposits/withdrawals take and why.",
    keywords: ["processing", "pending", "confirmations", "withdrawal time"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Typical timing
- Deposits: depend on network confirmations
- Withdrawals: may require review, security checks, and network confirmations
`
  },
  {
    category: "launchpad",
    slug: "what-is-launchpad",
    title: "What is Launchpad?",
    description: "Launchpad token sales and allocations (if enabled).",
    keywords: ["launchpad", "token sale", "allocation"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Launchpad
Launchpad allows users to participate in token sales when available on your deployment.
`
  },
  {
    category: "notifications",
    slug: "email-notifications",
    title: "Email notifications",
    description: "What emails we send and how to manage them.",
    keywords: ["email", "notifications"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Email notifications
Email notifications depend on your deployment configuration.
`
  },
  {
    category: "fees",
    slug: "trading-fees",
    title: "Trading fees",
    description: "How fees are calculated for trading.",
    keywords: ["fees", "trading"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Trading fees
Trading fees vary by market and configuration. Check the Fees page or your operator’s published schedule.
`
  },
  {
    category: "security",
    slug: "security-best-practices",
    title: "Security best practices",
    description: "Protect your account and assets.",
    keywords: ["security", "best practices", "phishing"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Recommendations
- Never share seed phrases or private keys.
- Verify URLs and bookmarks.
- Enable 2FA where available.
`
  },
  {
    category: "api",
    slug: "api-keys",
    title: "API keys",
    description: "Generate and secure API keys (optional feature).",
    keywords: ["api", "keys", "security"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## API keys
If API access is enabled, create keys in your account settings and restrict permissions.
`
  },
  {
    category: "troubleshooting",
    slug: "transaction-pending",
    title: "Transaction pending",
    description: "What to do when a deposit/withdrawal is pending.",
    keywords: ["pending", "transaction", "stuck"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    bodyMd: md`
## Checklist
- Verify network congestion
- Confirm address + network
- Check explorer status
`
  },
  {
    category: "contact-support",
    slug: "contact-support",
    title: "Contact support",
    description: "How to reach Lidex support.",
    keywords: ["support", "telegram", "email", "ticket"],
    updatedAt: "2026-04-07T00:00:00.000Z",
    popular: true,
    bodyMd: md`
## Support channels
- Telegram community/support
- Email support (if configured)

## What to include
- Your address or account identifier
- Order ids / tx hashes
- Screenshots of the issue
`,
    faqs: [
      { q: "Where is the fastest support?", a: "Telegram is typically fastest for initial triage." },
      { q: "Do you need my seed phrase?", a: "Never. Lidex will never request your private keys or seed phrase." }
    ]
  }
];

export function getHelpCategory(id: string) {
  return HELP_CATEGORIES.find((c) => c.id === id) || null;
}

export function listHelpArticlesByCategory(categoryId: HelpCategoryId) {
  return HELP_ARTICLES.filter((a) => a.category === categoryId).sort((a, b) => a.title.localeCompare(b.title));
}

export function getHelpArticle(categoryId: HelpCategoryId, slug: string) {
  return HELP_ARTICLES.find((a) => a.category === categoryId && a.slug === slug) || null;
}

export function popularHelpArticles(limit = 8) {
  const items = HELP_ARTICLES.filter((a) => a.popular).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return items.slice(0, limit);
}

