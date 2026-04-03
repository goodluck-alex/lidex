# Phase 4 — Internal liquidity engine (LDX-centric)

**Vision:** [`vision.md`](./vision.md) → *Phase 4 — internal liquidity engine*.  
**Preconditions:** Phase 3 engineering signed off per [`phase-3-tracking.md`](./phase-3-tracking.md); **governance** items in [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md) progressed per your counsel (no fixed gate in this repo).

**Liquidity rule (unchanged):** DEX = **0x / external only**; CEX execution and any **new internal pools** remain **off 0x** — [`architecture.md`](./architecture.md) §3.

---

## Goal

Use **LDX** (and configured pair assets) as the **platform liquidity engine**: internal pools and/or programmatic incentives so the **CEX orderbook** and related products have durable depth without routing CEX fills through 0x.

---

## Architectural non‑negotiables

| Rule | Detail |
|------|--------|
| **No 0x on CEX settlement** | New pools, rewards, and MM accounts settle **internally** (DB / contracts you own), not via `swap0x` or DEX swap routes. |
| **Clear inventory ownership** | LP positions, treasury, and user balances must be **separable** for accounting and reconciliation (extend [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md)). |
| **Separation from Phase 1 swap** | [`/v1/swap/*`](./architecture.md) stays DEX-only; do not alias internal pool trades into the 0x quote path. |

---

## Scope (Phase 4)

### Product (indicative)

- **Internal liquidity pools** (single-chain first) or **incentivized market-making** accounts — pick one primary mechanism v1, document the other as follow-on.
- **LDX** as incentive / fee-discount / stake collateral per product rules (exact tokenomics TBD at build time).
- **Rewards accrual** and **claim or auto-credit** path with **auditable ledger** rows (extend or parallel `cex_ledger_entries` / new tables).

### Backend (indicative)

- Prisma models: e.g. pool state, LP shares, reward epochs, accrual checkpoints (names TBD by design).
- Authenticated **`requireCexMode`** APIs for add/remove liquidity, reward claims, read-only pool stats.
- **No** coupling to `backend/modules/swap/swap.service.js` for CEX-side pool execution.

### Frontend (indicative)

- **`/cex/trade` or dedicated liquidity page**: pool depth, user LP, estimated rewards (no investment advice copy).
- Mode gate: CEX only; clear distinction from DEX swap.

### Compliance

- Pool and reward products may trigger **additional** disclosures (IL, smart-contract risk). Extend counsel memo from Phase 3.

---

## Out of scope (later)

- **Phase 5** full **staking** product (may overlap; keep hooks minimal until plan merge).
- **Phase 6** multi-chain pool deployment (design chainId-agnostic schema if cheap).
- **Margin / launchpad / governance** (Phase 8 bucket).

---

## Milestones (suggested)

| ID | Outcome |
|----|---------|
| **P4-M1** | Written **tokenomics + mechanism** choice (AMM internal vs OTC/MM ledger); threat model for admin keys. |
| **P4-M2** | **Data model + migrations**; read APIs for pool TVL / user share. |
| **P4-M3** | **Write path**: add/remove liquidity or MM credit rules; matcher integration if orderbook consumes pool quotes. |
| **P4-M4** | **Rewards** v1 + ledger audit; **UI** in CEX mode. |

---

## Acceptance criteria (Phase 4 “done” — draft)

Track granular checks in [`phase-4-tracking.md`](./phase-4-tracking.md). High level:

- [ ] Documented **no-0x** path for all new Phase 4 execution (code review).
- [ ] **LP / reward** movements **auditable** (DB + export procedure).
- [ ] **Reconciliation** extended for pool treasury wallets (add rows to [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md) §5 when addresses exist).
- [ ] CEX users can **participate** in v1 liquidity or rewards flow without using DEX swap for that flow.

---

## Repo anchors (in progress)

| Area | Notes |
|------|--------|
| `backend/prisma/schema.prisma` | `CexLiquidityPool`, `CexLiquidityPosition` |
| `backend/modules/cex/cex.liquidity.js` | Lazy primary pool + `listPools` / `getPool` / `listUserPositions` |
| `backend/server.js` | `GET`/`POST` `/v1/cex/liquidity/*` (writes require `CEX_LIQUIDITY_ENABLED=true`) |

---

## After Phase 4

Phase 5 per [`vision.md`](./vision.md): **staking and rewards** (may merge partially with Phase 4 incentives — resolve overlap in tracking).

---

## Related docs

| Document | Use |
|----------|-----|
| [`vision.md`](./vision.md) | Phases 1–8 |
| [`architecture.md`](./architecture.md) | DEX vs CEX |
| [`phase-3-plan.md`](./phase-3-plan.md) | Prior phase |
| [`dex-env.md`](./dex-env.md) | Pair activation (DEX); CEX pair config separate |
