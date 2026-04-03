# Phase 2 — tracking (LDX launch → Phase 3 gate)

Use this file to **execute and verify** Phase 2 before opening **Phase 3** (custodial / orderbook). Spec: [`phase-2-plan.md`](./phase-2-plan.md). **Liquidity rule:** DEX = **0x / external only**; CEX = **internal only** — [`architecture.md`](./architecture.md) §3.

---

## Preconditions

- [ ] Phase 1 signed off per [`phase-1-tracking.md`](./phase-1-tracking.md) (or consciously waived with noted risks).

---

## Progress log

- **2026-04-02 — BSC LDX:** Token `0x567A…432E1` verified via RPC (`name` Lidex, `symbol` LDX, `decimals` 18, `totalSupply` 500M). Recorded in [`deployments.md`](./deployments.md), [`shared/tokens/ldx.js`](../shared/tokens/ldx.js), root export **`LDX`** from `@lidex/shared`. Swap page: **`apiPost`** for `/v1/swap/*` + ledger confirm; BscScan link when UI chain is BSC (56).
- **Liquidity note:** LDX **swap quotes via 0x stay broken until** LP is added on aggregators’ AMMs (e.g. PancakeSwap). Then quotes/trades typically work **without** further Lidex code changes. See [`architecture.md`](./architecture.md) §3 and [`phase-2-plan.md`](./phase-2-plan.md) workstream B.

---

## Workstreams (engineering)

### A — Smart contracts

- [ ] Hardhat / Foundry **tests** in-repo for deployed LDX bytecode (optional if you treat BscScan as canonical)
- [x] Deploy + explorer record — **live on BNB Chain** ([BscScan](https://bscscan.com/token/0x567a4f63f6838005e104c053fc24a3510b0432e1))
- [x] Addresses recorded (`shared/tokens/ldx.js`, [`docs/deployments.md`](./deployments.md))

### B — DEX liquidity + 0x only

- [ ] **AMM LP first** (e.g. PancakeSwap pools on BSC for LDX/USDT, LDX/WBNB, …). **0x will not quote LDX** until this liquidity exists; the app cannot fix that from code alone.
- [ ] After LP exists: **`/v1/swap`** quote + execute smoke tests for **LDX/USDT** (then ETH/BNB legs); trading should work **automatically** once 0x sees the pools.
- [ ] **No 0x** wired into any **CEX** execution path (future code reviews)

### C — Shared + product flags

- [ ] Promote LDX rows via **`DEX_ACTIVE_PAIR_SYMBOLS`** in backend `.env` after quotes pass ([`dex-env.md`](./dex-env.md)); optional **`DEX_POOL_*`** for recorded Pancake pair addresses
- [ ] `shared/pairs.js`: can stay `coming_soon` for fresh repos; production flip is **env-first**
- [ ] `shared/tokens/*` + frontend `TOKENS` aligned per chain

### D — Backend / frontend

- [ ] Presale or launch **server** needs (if any): routes + Prisma
- [ ] Markets / home / swap UI: “Coming Soon” removed when `active`
- [ ] Copy / legal / runbooks as required

---

## Milestones (P2-M1 … P2-M4)

| ID | Outcome | Status |
|----|---------|--------|
| P2-M1 | LDX contract live + addresses in repo | ☑ (see Progress log) |
| P2-M2 | Presale / launch path live | ☐ |
| P2-M3 | DEX **0x** quotes OK for LDX pairs | ☐ |
| P2-M4 | Pairs active in UI; smoke doc updated | ☐ |

---

## Acceptance (Phase 2 done)

- [ ] LDX **live** with documented address(es)
- [ ] ≥1 LDX pair tradable via **DEX swap** (**0x**, external liquidity)
- [ ] **Shared** PAIRS + tokens are source of truth for API + app
- [ ] Team confirms **CEX** remains **internal liquidity only** in all new trade code

---

## Phase 2 sign-off → Phase 3

When the above is checked, proceed to **custodial + orderbook** per [`phase-3-plan.md`](./phase-3-plan.md) and [`vision.md`](./vision.md). Track Phase 3 execution in [`phase-3-tracking.md`](./phase-3-tracking.md).

---

## Related

| Doc | Use |
|-----|-----|
| [`phase-2-plan.md`](./phase-2-plan.md) | Full scope, risks, workstream detail |
| [`vision.md`](./vision.md) | Phases 1–8 |
| [`architecture.md`](./architecture.md) | API matrix, DEX vs CEX |
