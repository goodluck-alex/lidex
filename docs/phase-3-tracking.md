# Phase 3 — tracking (custodial CEX + orderbook)

Execute and verify **Phase 3** per [`phase-3-plan.md`](./phase-3-plan.md). **Liquidity:** CEX = **internal matcher only**; DEX = **0x / external only** — [`architecture.md`](./architecture.md) §3.

---

## Preconditions

- [x] Phase 1 baseline (DEX swap, referral, markets) operational for your deployment.
- [ ] Phase 2 items you care about (e.g. LDX live + quotes) signed off per [`phase-2-tracking.md`](./phase-2-tracking.md), or consciously waived.

---

## Engineering verification (repo)

| Check | Status | Notes |
|-------|--------|--------|
| CEX place / cancel limit (and market where implemented) | ☑ | `POST/DELETE /v1/cex/orders` → `modules/cex/matcher.service.js` |
| Orderbook + trades + stream (CEX mode) | ☑ | `GET /v1/cex/orderbook`, `trades`, `stream`; trade UI in `frontend/app/trade/components/Panels.tsx` |
| No `swap0x` / `swap.service` on CEX fill path | ☑ | CEX modules under `backend/modules/cex/`; `/v1/swap/*` remains `requireDexMode` |
| Custodial balances + ledger audit | ☑ | `CexBalance`, `CexLedgerEntry`; `GET /v1/cex/balances`, `GET /v1/cex/ledger` |
| On-chain bridge (deposit / withdraw) | ☑ | `modules/cex/cex.onchain.js`; wallet **Custodial** card |
| CEX wallet page: Web3 + custodial + Sign & Login | ☑ | `frontend/app/wallet/page.tsx` (CEX mode) |

---

## Product / compliance (governance — use with counsel)

Repo scaffold: **[`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md)** (regulatory checklist, KYC/AML outline, reconciliation with `cex_balances` / on-chain treasury, incident + pilot checklists). **Not legal advice.**

Complete when **your organization** has:

- [ ] **Regulatory** — counsel memo on licensing / custody / marketing claims for target jurisdictions (see §2 in scaffold).
- [ ] **AML program** — risk-based KYC/EDD, monitoring, SAR path, records retention (see §3).
- [ ] **Legal UX** — ToS / risk disclosures aligned with CEX (see §4).
- [ ] **Reconciliation** — named owner, cadence, materiality threshold, first **signed-off** run using §5 + DB + `GET /v1/cex/onchain/treasury`.
- [ ] **Security / keys** — prod secret handling for hot wallet and DB (see §6).
- [ ] **Incident + pilot** — on-call path and pilot checklist executed before widening access (§7–8).

---

## Milestones (P3-M1 … P3-M4)

| ID | Outcome | Status |
|----|---------|--------|
| P3-M1 | Data model: balances, orders, trades | ☑ (`backend/prisma/schema.prisma`) |
| P3-M2 | Authenticated CEX session (wallet SIWE / cookie) | ☑ (`/v1/auth/*`, `requireCexUser`) |
| P3-M3 | REST place/cancel + orderbook + matcher v1 | ☑ |
| P3-M4 | Trade UI + deposit/withdraw UX | ☑ |

---

## Acceptance (Phase 3 “done” — engineering)

- [x] Logged-in CEX user can place and cancel orders against the **internal book** (subject to env min-notional / liquidity).
- [x] **No 0x** on the CEX execution path (`cex/*` vs `swap/*`).
- [x] DEX `/v1/swap/*` behavior unchanged for DEX mode clients.
- [x] Ledger movements (**deposit / trade / withdraw / fee / on-chain**) auditable in DB + `GET /v1/cex/ledger` where applicable.

Formal **project sign-off** requires the **Product / compliance** table above (organization-owned), not only engineering acceptance.

---

## Related

| Doc | Use |
|-----|-----|
| [`phase-3-plan.md`](./phase-3-plan.md) | Full scope + non‑negotiables |
| [`vision.md`](./vision.md) | Phases 1–8 |
| [`architecture.md`](./architecture.md) | API matrix |
| [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md) | Custody compliance + reconciliation + ops |
| [`phase-4-plan.md`](./phase-4-plan.md) | Next phase (internal liquidity) |
