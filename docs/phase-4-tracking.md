# Phase 4 — tracking (internal liquidity engine)

Execute per [`phase-4-plan.md`](./phase-4-plan.md). **Liquidity:** CEX-side mechanisms stay **internal** — no 0x on pool settlement — [`architecture.md`](./architecture.md) §3.

---

## Preconditions

- [ ] Phase 3 **engineering** accepted per [`phase-3-tracking.md`](./phase-3-tracking.md).
- [ ] Phase 3 **governance** items (counsel, AML, reconciliation owner) at a stage your team requires before new custodial products — see [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md).
- [ ] LDX (or chosen incentive asset) **address and decimals** aligned across `shared/tokens`, backend CEX pair config, and any new pool contracts.

---

## Progress log

- **2026-04-02 — P4-M2 (partial):** Prisma `CexLiquidityPool` / `CexLiquidityPosition`, migration `20260411120000_cex_liquidity_pools`, module `modules/cex/cex.liquidity.js`, read routes `GET /v1/cex/liquidity/pools`, `GET /v1/cex/liquidity/pools/:id`, `GET /v1/cex/liquidity/positions` (auth). `/v1/cex/config` includes `liquidity.readApi`. **Also fixed** missing `cexPublicConfig` import in `server.js` (was a runtime ReferenceError on `/v1/cex/config`).
- **2026-04-03 — P4-M3 (partial):** Constant-product **add** / **remove** liquidity in `cex.liquidity.js` (Serializable txs); ledger kinds `liquidity_add_*`, `liquidity_remove_*`; **`CEX_LIQUIDITY_ENABLED=true`** gate; `POST /v1/cex/liquidity/add`, `POST /v1/cex/liquidity/remove`; `cex.config` **`features.liquidityWritesEnabled`**; trade **Balances** panel LP UI when enabled.
- **2026-04-03 — Pool ↔ matcher (market IOC):** **`CEX_POOL_MATCHING_ENABLED`**. After the order book, **market sell** / **market buy** remainder executes against DB pool (fee `feeBps` on swap + existing taker fees). Synthetic `internal_pool` orders + migration `20260412120000_cex_pool_trade_proxies`; hydrate excludes them from the book.
- **2026-04-03 — Pool ↔ limit / stop-limit:** Same flag. **`matchIncomingBookOnly`** → **`extendLimitSellWithPoolInTx`** / **`extendLimitBuyWithPoolInTx`** (VWAP vs limit via binary search) → rest remainder; **`applyLimitBookPoolAndRestTx`** shared by **`placeLimitOrder`** and **`activateStopOrderInTransaction`**.
- **2026-04-03 — P4-M4 (v1):** LP rewards: env **`CEX_LIQ_REWARD_ASSET`** + **`CEX_LIQ_REWARD_RATE_PER_SECOND`**; pool `reward_acc_per_lp` + position `reward_debt` / `unclaimed_reward`; migration `20260413120000_cex_liquidity_rewards`; **`POST /v1/cex/liquidity/rewards/claim`**; positions list syncs accrual before read; Balances LP **Claim** UI.

---

## Workstreams

### A — Design & tokenomics

- [ ] Choose primary v1 mechanism: **internal AMM** vs **ledger-based MM / incentives** (document in plan or ADR).
- [ ] Fee flow: trading fees → LPs / treasury / burn (counsel-sensitive).

### B — Data & APIs

- [x] Prisma models + migrations (pools + positions; primary pool lazily created)
- [x] Read APIs (pool list/detail; user positions)
- [x] Write APIs — LP add/remove + **`POST /v1/cex/liquidity/rewards/claim`** behind `requireCexUser` + gates

### C — Matcher / book integration (if applicable)

- [x] **Market** orders: book first, then **internal pool** (`CEX_POOL_MATCHING_ENABLED`, constant-product; `cex_trades` + taker fees).
- [x] **Limit** (and **stop-limit** on activation): book first, then pool for the remainder **only if** pool VWAP respects the limit (sell: avg ≥ limit; buy: avg ≤ limit), then rest any leftover on the book.

### D — Frontend

- [x] CEX trade **Balances** panel — LP add/remove + pending rewards + claim when rewards env is set

### E — Ops

- [x] Extend reconciliation for **internal LP** (DB pool + positions) and future pool treasury addresses — see `cex-compliance-and-ops.md` §5.
- [x] Deploy checklist + Phase 4 env vars documented in `backend/.env.example` (Phase 4: internal liquidity pools).

---

## Milestones (P4-M1 … P4-M4)

| ID | Status | Notes |
|----|--------|--------|
| P4-M1 | ☐ | |
| P4-M2 | ☑ | Models + read APIs + primary pool bootstrap |
| P4-M3 | ☑ | LP add/remove + UI; **market + limit** pool leg after book when `CEX_POOL_MATCHING_ENABLED` |
| P4-M4 | ☑ v1 | Env emission + accrual + claim + ledger `liquidity_reward` |

---

## Related

| Doc | Use |
|-----|-----|
| [`phase-4-plan.md`](./phase-4-plan.md) | Scope + acceptance |
| [`vision.md`](./vision.md) | North star |
