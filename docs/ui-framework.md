# Lidex Hybrid UI Framework (DEX Lite + CEX Full)

## Core idea

One UI codebase runs in two feature sets:

- **DEX Mode (Lite)**: minimal, mobile-first, non-custodial only, swap-centric.
- **CEX Mode (Full)**: advanced, dashboard-oriented, custodial + non-custodial, orderbook trading, staking, launchpad.

Mode is controlled by a single app-level state (e.g. `mode = "dex" | "cex"`), which:

- controls navigation visibility
- controls route access (redirect / hide)
- controls which wallet subsystem is enabled (custodial features off in DEX)

## Top-level navigation matrix

| Section | DEX (Lite) | CEX (Full) |
|---|---:|---:|
| Swap | ✅ | ✅ |
| Trade | ❌ | ✅ |
| Markets | ✅ | ✅ |
| Wallet | ✅ Lite | ✅ Full |
| Referral | ✅ | ✅ |
| Staking | ❌ | ✅ |
| Launchpad | ❌ | ✅ |
| Settings | ✅ | ✅ |
| Help/Docs | ✅ | ✅ |

## Page specs

### Swap (DEX)

**Purpose**: quick swaps using external liquidity.

**Visible elements**:
- from/to token selector
- amount input
- slippage
- swap button
- price impact
- transaction status

**Hidden in DEX**:
- orderbook panels
- historical charts
- custodial wallet features
- staking / launchpad

**UX**: single-column, clean “lite swap experience”.

### Trade (CEX)

**Purpose**: orderbook trading + charts.

**Visible elements**:
- trading pair selection
- candlestick chart
- orderbook buy/sell
- open orders
- trade history
- order types: market / limit / stop
- wallet balances (custodial + non-custodial)
- fee information

**UX**: multi-column dashboard: chart left, orderbook center, orders/history right.

### Markets

**DEX Mode**:
- small list (top tokens + LDX)
- price, 24h change, volume

**CEX Mode**:
- full token list
- filters (volume, gainers, losers)
- depth indicators
- per-token mini charts

### Wallet

| Feature | DEX | CEX |
|---|---:|---:|
| Non-custodial connect | ✅ | ✅ |
| Custodial wallet | ❌ | ✅ |
| Deposit/Withdraw | ❌ | ✅ |
| Transfer DEX/CEX | ❌ | ✅ |
| Portfolio overview | ✅ | ✅ |
| Staking overview | ❌ | ✅ |

**UX**:
- DEX: wallet balance + swap-ready interface
- CEX: full dashboard including custodial flows and balances

### Referral

**DEX Mode**:
- referral link
- basic stats (direct + earned)

**CEX Mode**:
- levels, earnings, bonuses
- referred user tracking
- rewards for staking/trading

### Staking (CEX only)

- stake LDX
- view active stakes
- rewards calc
- tier benefits

### Launchpad (CEX only)

- token launch interface
- purchase via LDX/USDT
- participation stats

### Settings

| Option | DEX | CEX |
|---|---:|---:|
| Theme | ✅ | ✅ |
| Preferred wallet type | ✅ | ✅ |
| Slippage settings | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Account management | ❌ | ✅ |

## Layout guidance

### DEX Mode (Lite)

- top nav: Logo + Swap + Markets + Wallet + Referral
- main: swap card (single column)
- below: market overview card
- below: referral stats card

### CEX Mode (Full)

- top nav: Logo + Trade + Swap + Markets + Wallet + Referral + Staking + Launchpad
- main: 3-column trading layout
- below: wallet/portfolio panels + markets + referral/rewards

## Brand palette (suggested)

- Primary: `#00C896` (green)
- Secondary: `#2979FF` (blue)
- Background: `#0B0F1A` (dark)
- Text: `#FFFFFF` / `#AAAAAA`

## Frontend routing suggestion (Next.js App Router)

- `/swap` (DEX + CEX)
- `/trade` (CEX only)
- `/markets` (DEX + CEX)
- `/wallet` (DEX + CEX, but CEX shows custodial tabs)
- `/referral` (DEX + CEX)
- `/staking` (CEX only)
- `/launchpad` (CEX only)
- `/settings` (DEX + CEX)
- `/docs` (DEX + CEX)

## Implementation notes (current scaffold)

### Route gating

- CEX-only routes are guarded in `frontend/middleware.ts` using the `lidex_mode` cookie.
- When `lidex_mode=dex`, `/trade`, `/staking`, `/launchpad` redirect to `/swap`.

### Responsive layout pattern

- Desktop: multi-column dashboard panels
- Mobile: tabbed panels (same content, single-column)

Pages currently using this pattern in CEX mode:

- `/trade` (chart + orderbook + order entry + orders/history)
- `/wallet` (overview/balances/custodial/staking)
- `/markets` (list/details/depth)
- `/referral` (overview/users/bonuses)

