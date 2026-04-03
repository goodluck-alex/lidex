# Phase 3 — Hybrid expansion (custodial CEX + orderbook)

**Vision:** [`vision.md`](./vision.md) → *Phase 3 — hybrid expansion*.  
**Preconditions:** Phase 2 tracking wherever you draw the line for LDX DEX ([`phase-2-tracking.md`](./phase-2-tracking.md)). **Liquidity split:** CEX = **internal only**, no **0x** — [`architecture.md`](./architecture.md) §3.

---

## Goal

Add **custodial** capabilities and **orderbook** trading so Lidex is a true **hybrid**: users can trade **DEX** (wallet + 0x) and **CEX** (accounts + internal book), with a product-defined path to **move between** the two over time.

---

## Architectural non‑negotiables

| Rule | Detail |
|------|--------|
| **No 0x on CEX fills** | Orderbook matching, execution, and settlement use **internal liquidity** only. Do not call `swap0x` or 0x API from CEX trade routes. |
| **Keep `/v1/swap/*` DEX-only** | Existing wallet swap stays behind `requireDexMode` and 0x. |
| **Separation of concerns** | New modules: e.g. `modules/tradeExecution` (matcher), `modules/custody` (balances, deposit/withdraw ledger), distinct from `modules/swap`. |

---

## Scope (Phase 3)

### Product

- **User accounts** for CEX (may extend current Prisma `User` or add profile / KYC flags — decide early).
- **Custodial wallet / ledger** — internal accounting of assets (deposits, withdrawals, available/locked for orders). *Not* on-chain custody in v1 unless you explicitly scope on-chain vaults.
- **Orderbook** — bids/asks, depth UI, place/cancel orders.
- **Internal matching** — in-memory or database-backed matcher; deterministic rules (price-time priority, etc.) documented.

### Backend (indicative)

- New or expanded **`/v1/trade/*`** (or namespaced) routes: order CRUD, orderbook snapshot, trades history — all **`requireCexMode`** (or stricter auth).
- **Persistence:** Prisma models for balances, orders, trades, deposit/withdraw requests (audit trail).
- **No integration** with `backend/modules/swap/swap.service.js` for CEX fills.

### Frontend

- **`/cex/trade`** (and mobile panels) wired to real APIs instead of placeholders where applicable.
- **Mode gate:** CEX flows require **`lidex_mode=cex`** + session strategy you choose (wallet login may be insufficient for custodial; email/2FA/password is out of band unless you add it).

### Compliance & ops

- Custodial and order-taking may trigger **licensing / custody / KYC** obligations — engage counsel before launch.
- **Runbooks:** incident response, reconciliation (internal ledger vs any bank or chain movements). **Scaffold:** [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md) (checklists + reconciliation outline; not legal advice).

---

## Out of scope (later phases)

- **Phase 4** “internal liquidity engine” as LDX incentive pools (separate plan).
- **Margin / launchpad / governance** (Phase 8).
- **Cross-margin between DEX and CEX** until explicitly designed.

---

## Milestones (suggested)

| ID | Outcome |
|----|---------|
| **P3-M1** | Data model + migrations: balances, orders, trades (minimal viable). |
| **P3-M2** | Authenticated CEX session / account binding (document threat model). |
| **P3-M3** | REST (or RPC) for place/cancel + orderbook snapshot; matcher v1. |
| **P3-M4** | **Trade** UI on **CEX** mode consuming live APIs; deposit/withdraw MVP or stub with clear UX. |

---

## Acceptance criteria (Phase 3 “done”)

Engineering acceptance is tracked in [**`phase-3-tracking.md`**](./phase-3-tracking.md). Summary:

- [x] A **logged-in CEX user** can place and cancel limit orders against the **internal book** (paper or small-value pilot).
- [x] **No 0x** calls on the CEX order execution path (code review checklist).
- [x] **DEX** swap (`/v1/swap/*`) unchanged in behavior for `requireDexMode` clients.
- [x] Internal ledger movements (**deposit / trade / withdraw / fee**, including on-chain bridge rows) are **auditable** in the database.

**Product / compliance** (licensing, KYC, runbooks, reconciliation) remains a **non-code** gate before calling the phase closed for launch.

---

## Repo anchors today

| Area | Notes |
|------|--------|
| `backend/modules/cex/matcher.service.js` | Matcher + `placeOrder` / `cancelOrder`; uses `cex.balances`, Prisma orders/trades. |
| `backend/server.js` | `/v1/cex/*` routes (orders, balances, on-chain, ledger). |
| `frontend/app/trade/components/Panels.tsx` | Orderbook, place/cancel, balances, SSE — live CEX APIs. |
| `frontend/app/wallet/page.tsx` | CEX mode: Web3 balances, **`GET /v1/cex/balances`**, Sign & Login, `CexCustodialCard`. |
| `docs/phase-3-tracking.md` | Verification checklist + milestone status. |

---

## After Phase 3

Track execution in **`phase-3-tracking.md`**. **Phase 4** (internal liquidity engine): [`phase-4-plan.md`](./phase-4-plan.md) · [`phase-4-tracking.md`](./phase-4-tracking.md).

---

## Related docs

| Document | Use |
|----------|-----|
| [`vision.md`](./vision.md) | Phases 1–8 |
| [`architecture.md`](./architecture.md) | DEX vs CEX, API matrix |
| [`phase-2-plan.md`](./phase-2-plan.md) | LDX / DEX launch |
| [`dex-env.md`](./dex-env.md) | Env-driven DEX pair activation (unchanged for CEX matcher) |
