# Phase 1 — tracking (before Phase 2)

Use this document to **verify Phase 1 is done** before starting Phase 2 work. The long-range roadmap is [`vision.md`](./vision.md); Phase 1 product spec is [`phase-1-plan.md`](./phase-1-plan.md). This file is the **checklist + engineering reality**.

---

## How to use

1. Walk through **Milestones** and **Acceptance criteria**; tick or date items as you confirm them.
2. Run **Technical verification** in a clean dev environment (backend + DB + frontend).
3. Resolve or explicitly defer **Open gaps** so Phase 2 does not inherit silent bugs.

---

## Milestones (from plan)

| ID | Milestone | Status | Notes |
|----|-----------|--------|--------|
| M1 | Real data wiring (markets, referral from API) | ☐ | Home/markets/referral use `services/api.ts` + `NEXT_PUBLIC_BACKEND_URL`. |
| M2 | Referral v1 (link, attribution, tiers, stats UI) | ☐ | Ref cookie/param → attach after `verify`; stats + ledger from backend. |
| M3 | 0x quote + execute (calldata → wallet sign) | ☐ | `/v1/swap/quote`, `/v1/swap/execute`; DEX mode + `X-Lidex-Mode` on calls. |
| M4 | Polish + hardening (loading/errors, rate limits) | ☐ | Referral/swap/auth limiters in `backend/middleware/security.js`. |

**Legend:** ☐ not verified · ☑ done (add date in Notes if useful)

---

## Acceptance criteria (from plan)

| Criterion | Status | Notes |
|-----------|--------|--------|
| DEX user: `/dex/swap` (or swap route), connect wallet, quote, tx flow | ☐ | RainbowKit + wagmi; swap page uses backend 0x orchestration. |
| `/markets`: five active pairs + LDX “Coming Soon” | ☐ | Confirm against `@lidex/shared` / backend pairs. |
| `/referral`: shareable link + tier splits + basic stats | ☐ | Auth session optional for link; stats richer when logged in. |
| CEX-only API surfaces gated when UI is DEX (and vice versa) | ☐ | Backend: `requireDexMode` / `requireCexMode`; frontend sends mode header from `lidex_mode` cookie. |
| `npm run dev:frontend` + `npm run dev:backend` documented | ☐ | See root `README.md`; backend needs `DATABASE_URL` + migrations applied. |

---

## Technical verification (engineering)

Run through once per release candidate:

- [ ] **Database:** `cd backend && npm run db:ping` (or migrate deploy) succeeds; no reliance on removed in-memory user store.
- [ ] **CORS:** Frontend origin listed in `backend` `ALLOWED_ORIGINS` when not using default localhost ports.
- [ ] **Auth:** Wallet page “Sign & Login” sets session; `GET /v1/me` returns user when cookie present; logout clears session.
- [ ] **Mode:** Toggling DEX/CEX updates `lidex_mode` cookie; API returns 400 without `X-Lidex-Mode` on gated routes (expected).
- [ ] **Swap path:** Quote and execute succeed against configured 0x key and fee env; optional ledger confirm if testing referrals.

---

## Plan deltas (vs `phase-1-plan.md`)

The plan still mentions **in-memory** storage for MVP. The codebase now uses **PostgreSQL + Prisma** for users, referral attachments, ledger, and auth sessions. Treat the plan’s “Next step: Postgres” as **done**; update `phase-1-plan.md` when you next edit it so docs stay aligned.

---

## Open gaps (track before Phase 2)

These are **known sharp edges** from the Phase 1 codebase; fix or accept explicitly:

| Item | Severity | Notes |
|------|----------|--------|
| Backend session vs wagmi disconnect | — | **Addressed:** `disconnect()` calls `apiLogout`; RainbowKit disconnect clears session via connected→disconnected transition. |
| `wallet.user` vs account switch | — | **Addressed:** if connected address ≠ `user.address`, session is invalidated. `/v1/me` still on mount; use **Sign & Login** after switching accounts. |
| Duplicate HTTP patterns on swap | — | **Addressed:** swap uses `apiPost` / `api.ts`. |
| ~~`useEvmWallet`~~ removed | — | Consolidated on `useWallet`; session clears on disconnect / account mismatch. |
| WalletConnect project id | Prod | Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for production; dev may use RainbowKit demo id. |

---

## Phase 1 sign-off → Phase 2

When the tables above are **checked** and gaps are **resolved or accepted in writing**, Phase 1 is closed. Start Phase 2 execution from [`phase-2-plan.md`](./phase-2-plan.md).

Living system map: [`architecture.md`](./architecture.md) (wiring, wallet vs session, `/v1` matrix).
