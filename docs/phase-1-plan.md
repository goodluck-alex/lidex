# Phase 1 — MVP Launch Plan (Simple Hybrid DEX)

## Goal

Ship a **non-custodial DEX Lite** experience with **external liquidity (0x)** and an **early referral system**, with a clean path to evolve into the full hybrid exchange.

Phase 1 focuses on:

- **DEX Mode (Lite)** user journey works end-to-end
- **No custodial funds** stored by Lidex
- Referral tracking starts early
- Only a small token universe (top pairs), plus **LDX pairs shown as “Coming Soon”**

## Scope (Phase 1)

### Product scope

- **DEX Lite UI** (swap, markets, wallet (web3), referral, settings)
- **External liquidity integration** (0x quote + swap flow)
- **Referral system** (basic tiers + earnings display; server-tracked)
- **Markets list**:
  - Active: ETH/USDT, BNB/USDT, MATIC/USDT, AVAX/USDT, ARB/USDT
  - Coming soon (visible but disabled): LDX/USDT, LDX/ETH, LDX/BNB

### Out of scope (later phases)

- Custodial wallets (deposit/withdraw)
- Orderbook/matching engine
- Staking
- Launchpad
- Multi-chain + cross-chain liquidity routing

## Deliverables

### Frontend (Phase 1)

**Pages**
- `/` (choose mode)
- `/swap` (DEX Lite swap flow)
- `/markets` (active + coming soon pairs)
- `/wallet` (connect wallet, balances)
- `/referral` (link + basic stats)
- `/settings` (theme/slippage defaults)
- `/docs` (help/spec links)

**Mode behavior**
- DEX Lite is default.
- CEX-only pages remain gated (already in scaffold).

### Backend (Phase 1)

Backend is used for **tracking + configuration** (not custody).

**Endpoints**
- `GET /health`
- `GET /v1/markets/pairs`
  - returns active pairs + coming soon pairs
- `GET /v1/referral/link`
  - returns a shareable referral link for an anonymous or authenticated user id
- `GET /v1/referral/stats`
  - returns basic referral stats and tier payout splits

**Data storage**
- MVP can be **in-memory** (dev only) with clear interfaces for later DB upgrade.
- Next step after MVP: Postgres tables for users, referrals, rewards ledger.

## Milestones

### M1 — “Real data wiring”
- Frontend fetches from backend for:
  - markets pairs
  - referral link/stats

### M2 — “Referral system v1”
- Generate referral link
- Track referral attribution (cookie or URL param)
- Compute tier splits (static config in Phase 1)
- Show basic stats in UI

### M3 — “0x integration (testnet first)”
- Quote: token in/out, amount, slippage
- Execute: return calldata for wallet to sign (frontend handles signing)
- Track swap attempts (telemetry; optional)

### M4 — “Polish + hardening”
- Loading states, error states
- Rate limiting on referral endpoints (simple)
- Validation

## Acceptance criteria (Phase 1)

- **DEX Lite user can**:
  - open `/swap`, connect wallet (stub first), view a quote (stub first), and see a clean transaction status
  - open `/markets` and see the 5 active pairs + LDX pairs marked “Coming Soon”
  - open `/referral` and see a referral link + tier splits + basic stats
- **CEX-only routes** are not reachable in DEX mode (already implemented in middleware)
- Frontend runs with `npm run dev:frontend`, backend runs with `npm run dev:backend`

## Implementation mapping (repo)

- Backend:
  - `backend/server.js` (Express)
  - `backend/modules/referral/*` (logic)
  - `backend/modules/*` for future growth
- Frontend:
  - `frontend/services/` (API client)
  - `frontend/app/markets/page.tsx` (pairs list UI)
  - `frontend/app/referral/page.tsx` (referral UI)

