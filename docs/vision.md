# Lidex Hybrid Exchange — full development vision

This document is the **north star** for product and engineering: what Lidex becomes over time, and **in which order** to build it. Implementation checklists for the current milestone live in [`phase-1-plan.md`](./phase-1-plan.md), [`phase-1-tracking.md`](./phase-1-tracking.md), and the technical map in [`architecture.md`](./architecture.md).

---

## Overview

**Lidex** is a **hybrid crypto exchange** combining:

1. **Non-custodial DEX** — external liquidity, user-controlled wallets  
2. **Custodial CEX** — internal liquidity, accounts, orderbook  
3. **LDX token ecosystem** — pairs, staking, referrals, fee mechanics, incentives  

The strategy is to **launch simple first**, then **evolve gradually** into a full hybrid exchange. Development must follow **phase-by-phase architecture** to contain complexity and reduce bugs.

---

## Core architecture (three major systems)

### 1. Non-custodial DEX

- Wallet connect (MetaMask, WalletConnect, Trust Wallet, etc.)
- **External liquidity only** — **0x** is the **external liquidity** layer for the DEX (aggregate of third-party AMM/RFQ liquidity). *Normative detail:* [`architecture.md`](./architecture.md) §3 (DEX vs CEX liquidity split).
- **No funds stored by Lidex** for DEX swaps
- Simple swap-focused interface

### 2. Custodial exchange (CEX)

- User accounts
- Deposits and withdrawals
- Orderbook trading
- **Internal liquidity only** — matching and fills come from **Lidex’s own book / inventory**, not from **0x** (0x is **not** used for CEX execution)

### 3. LDX token ecosystem

- Trading pairs (including LDX-centric pairs)
- Staking
- Referral rewards
- Fee discounts
- Liquidity incentives

---

## Phase 1 — MVP launch (simple hybrid DEX)

**Goal:** Ship a **simple non-custodial DEX** with **external liquidity** and early growth hooks.

### Non-custodial trading

- Users connect a wallet and trade using **external liquidity**.
- **Wallets:** MetaMask, WalletConnect, Trust Wallet (via standard wallet connectors).
- **Liquidity source:** **0x Protocol**.

### Top five EVM trading pairs (initial)

| Pair | Role |
|------|------|
| ETH / USDT | Core liquidity anchor |
| BNB / USDT | |
| MATIC / USDT | |
| AVAX / USDT | |
| ARB / USDT | |

**Purpose:** Build trust and offer **immediate** trading utility.

### Referral system (early)

Users can:

- Invite friends  
- Earn a **share of trading fees** by tier  

**Example tier split (illustrative):**

| Level | Example share |
|-------|----------------|
| Level 1 | 30% |
| Level 2 | 10% |
| Level 3 | 5% |

**Purpose:** User growth and early adoption.

### LDX token pairs (“Coming soon”)

Show but **disable** trading:

- LDX / USDT  
- LDX / ETH  
- LDX / BNB  

Display **“Coming soon”** in the UI.

**Purpose:** Build anticipation and prepare for token launch.

*Repo alignment:* detailed Phase 1 deliverables and acceptance criteria → [`phase-1-plan.md`](./phase-1-plan.md); verification before Phase 2 → [`phase-1-tracking.md`](./phase-1-tracking.md).

---

## Phase 2 — LDX token launch

**Goal:** Launch **LDX** and start the **internal ecosystem**.

**Features (vision):**

- LDX presale (or equivalent launch mechanism)  
- Liquidity creation  
- **Enable** LDX trading pairs, for example:  
  - LDX / USDT  
  - LDX / ETH  
  - LDX / BNB  

---

## Phase 3 — hybrid expansion (custodial exchange)

**Goal:** Add **custodial** trading and **orderbook** so Lidex becomes a true **hybrid**.

**Features:**

- User accounts  
- Custodial wallet  
- Orderbook trading  
- Internal liquidity  

**User experience:** trade via **DEX**, trade via **CEX**, and **move between** both where product design allows.

---

## Phase 4 — internal liquidity engine

**Goal:** Use **LDX** as the **liquidity engine** of the platform.

**Implementation:** [`phase-4-plan.md`](./phase-4-plan.md) · track: [`phase-4-tracking.md`](./phase-4-tracking.md).

**Features:**

- Internal liquidity pools  
- LDX trading incentives  
- Market making  
- Liquidity rewards  

**LDX becomes:** base trading token, incentive token, and liquidity token.

---

## Phase 5 — staking and rewards

**Features:**

- LDX staking  
- Trading fee rewards  
- Staking tiers  

**Example benefit model:** stake LDX → unlock lower fees, higher referral upside, premium features (exact rules TBD at build time).

---

## Phase 6 — multi-chain expansion

**LDX and product footprint across chains**, starting from **BNB Chain**, then expanding, for example:

- Ethereum  
- Polygon  
- Avalanche  
- Arbitrum  

**Features:**

- Multi-chain trading  
- Cross-chain liquidity (as feasible)  
- Chain switching in the product  

---

## Phase 7 — token listing ecosystem

**Features:**

- Projects can **list tokens**  
- Pair with **LDX**  
- Provide liquidity  

**Example pair shape:** `TOKEN / LDX`

**Purpose:** Increase LDX demand and grow the ecosystem.

---

## Phase 8 — advanced hybrid features

**Final vision bucket (build when prior phases justify it):**

- Launchpad  
- Advanced orderbook  
- Margin trading *(optional / future)*  
- Liquidity mining  
- Governance  

---

## Final platform structure (end state)

| Layer | What it is |
|-------|------------|
| **DEX (non-custodial)** | External liquidity, wallet-based trading |
| **CEX (custodial)** | Accounts, orderbook, internal liquidity |
| **LDX ecosystem** | Staking, referral, liquidity, incentives |

---

## Development order summary

| Phase | Focus |
|-------|--------|
| **1** | Simple DEX + external liquidity + referral (+ LDX pairs “coming soon”) |
| **2** | LDX token launch |
| **3** | Custodial exchange (hybrid) |
| **4** | Internal liquidity engine |
| **5** | Staking and rewards |
| **6** | Multi-chain |
| **7** | Listings ecosystem |
| **8** | Advanced features (launchpad, governance, etc.) |

---

## Key principle

**Start simple · launch fast · expand gradually**

This is critical to avoid unbounded complexity and to keep defect rates manageable as the stack grows.

---

## End goal

Lidex becomes a:

- **Hybrid** exchange (DEX + CEX)  
- **Multi-chain** platform  
- **Token-driven** economy (LDX)  
- **Liquidity-aggregated** trading experience  
- **Scalable** product and engineering platform  

---

## Related documentation

| Document | Use |
|----------|-----|
| [`vision.md`](./vision.md) (this file) | Product roadmap and phase intent |
| [`phase-1-plan.md`](./phase-1-plan.md) | Phase 1 scope and milestones in repo terms |
| [`phase-1-tracking.md`](./phase-1-tracking.md) | Pre–Phase 2 verification checklist |
| [`phase-2-plan.md`](./phase-2-plan.md) | LDX launch execution plan (contracts, liquidity, pairs) |
| [`phase-2-tracking.md`](./phase-2-tracking.md) | Phase 2 checklist / sign-off before Phase 3 |
| [`phase-3-plan.md`](./phase-3-plan.md) | Custodial CEX + orderbook (internal liquidity only) |
| [`architecture.md`](./architecture.md) | Current wiring: API, wallet, mode, sessions |
| [`deployments.md`](./deployments.md) | On-chain addresses (LDX, etc.) |
| [`dex-env.md`](./dex-env.md) | Env-driven DEX pair activation + optional pool registry |
| [`ui-framework.md`](./ui-framework.md) | UI modes and page layout guidance |

When a phase moves from vision to execution, keep **vision** stable and update **phase-N-plan** files as work progresses.
