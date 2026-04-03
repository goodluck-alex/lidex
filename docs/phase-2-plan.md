# Phase 2 — LDX token launch (execution plan)

**Vision reference:** [`vision.md`](./vision.md) → *Phase 2 — LDX token launch*.

**Precondition:** Phase 1 verified per [`phase-1-tracking.md`](./phase-1-tracking.md). Technical wiring: [`architecture.md`](./architecture.md).

**Liquidity rule (from architecture):** **DEX** = external liquidity only (**0x** as the DEX external provider). **CEX** = internal liquidity only — **no 0x** on custodial/orderbook execution. Phase 2 LDX **spot via app DEX swap** is validated through **0x**; any future **LDX on CEX** is a separate, internal-only path.

---

## Goal

Launch **LDX** as a real, tradeable asset and **start the internal ecosystem**: presale (or equivalent), **on-chain liquidity** that **0x can aggregate** for **DEX** swaps, and **enabled** LDX-centric pairs (initially **LDX/USDT**, **LDX/ETH**, **LDX/BNB**) on the **DEX / 0x** path where quotes prove out. (CEX listing of LDX remains **Phase 3+** and **internal liquidity only**.)

---

## Current repo baseline (Phase 1)

| Area | Today |
|------|--------|
| **Pairs** | `shared/pairs.js`: five **active** EVM/USDT pairs; three **LDX** pairs marked `coming_soon`. |
| **LDX metadata** | `shared/tokens/ldx.js`: symbol, decimals, **placeholder** `addresses` (BSC has a hex; others `null`). |
| **Swap presets** | `shared/tokens/phase1.js`: **LDX only on chain 56** in the token map; swap UI uses `@lidex/shared` tokens per chain. |
| **API** | `GET /v1/pairs` and markets flows read **`@lidex/shared` `PAIRS`** via `backend/modules/pairs`. |
| **UI** | Markets/home show LDX pairs as **“Coming Soon”**; swap does not treat LDX pairs as first-class until tokens + 0x paths exist. |
| **Contracts** | `contracts/LDXToken.sol` is a **minimal stub** (name/symbol/decimals only) — not a production ERC-20. |

Phase 2 turns the above from **plumbing + placeholders** into **live launch configuration**.

---

## Scope (Phase 2)

### In scope

1. **Token** — Production-grade **ERC-20 LDX** (mint/burn/caps/roles as you decide), **deploy** to launch chain(s), **verify** contracts, **document** addresses.
2. **Launch mechanics** — **Presale** (contract + UI), **auction**, or **partner launchpad** — pick one approach and ship the minimal path (this plan does not mandate which).
3. **Liquidity (DEX path only)** — **You** add LP on external AMMs **0x aggregates** (e.g. **PancakeSwap** on BSC for LDX/USDT, etc.). The Lidex backend **cannot** quote LDX pairs through **0x** until that liquidity exists; there is no separate “0x-side” pool to turn on. After pools are live, swap quotes in the app generally **start working on their own** as 0x picks up the routes. *Do not* confuse this with CEX internal liquidity — see [`architecture.md`](./architecture.md) §3.
4. **Product enablement** — Move LDX pairs from **`coming_soon` → `active`** in `shared/pairs.js` **when** **DEX** **0x** quotes work for those routes; update **`shared/tokens/ldx.js`** and **`shared/tokens/phase1.js`** (and frontend `TOKENS`) so **LDX/USDT**, **LDX/ETH**, **LDX/BNB** are quotable on the right chains via the **swap (DEX)** flow.
5. **Config & env** — Backend/frontend env for **live** token addresses, optional **feature flag** (e.g. `LDX_TRADING_ENABLED`) if you want a staged flip without redeploying.

### Out of scope (later phases per vision)

- **Custodial** accounts and **orderbook** (Phase 3).
- **Internal liquidity engine** as a first-class product (Phase 4).
- **Staking rewards** productization (Phase 5) — may stub UI only until then.
- **Multi-chain LDX** beyond what you explicitly launch in Phase 2 (Phase 6).

---

## Workstreams

### A. Smart contracts

- [ ] Replace stub `LDXToken.sol` with audited or review-ready **ERC-20** (supply model, admin roles, pause if needed).
- [ ] Add **presale / vesting** contracts if you launch via presale (or integrate external standard).
- [ ] **Hardhat** (or chosen toolchain): compile, test, deploy scripts; network config for **BNB Chain first** unless you change vision order.
- [ ] **Verify** on block explorer; store addresses in repo (e.g. `shared/tokens/ldx.js` or `docs/deployments.md`).

### B. On-chain liquidity and 0x (DEX only)

- [ ] For each **DEX** LDX pair you want in the app, **create/add liquidity on AMMs** (e.g. PancakeSwap v2/v3 on BSC) so there is a real pool — **0x does not quote until this exists**.
- [ ] After LP is live, confirm **0x API** returns viable quotes for your **sell/buy** token addresses (chain-specific). Until then, keep LDX rows **`coming_soon`** in `shared/pairs.js` and expect swap quotes to fail for those legs — **expected**, not an app bug.
- [ ] Document **fee recipient** and **integrator** settings (`backend` env) for LDX-era **DEX** swaps.
- [ ] **Explicit non‑goal:** wire **0x** into any **CEX** trade or matcher; CEX uses **internal liquidity only** when built.

### C. Shared config + env (`@lidex/shared` + backend `.env`)

- [ ] Set **canonical LDX contract address(es)** per launch chain in `shared/tokens/ldx.js`.
- [ ] Extend `shared/tokens/phase1.js` (or introduce `phase2.js`) so **ETH**, **BNB**, **USDT** **and** **LDX** presets exist on every chain where you enable LDX pairs (wrappers: WETH/WBNB as today).
- [ ] **Prefer env for go-live:** set **`DEX_ACTIVE_PAIR_SYMBOLS`** (and optional **`DEX_POOL_*`**) per [`dex-env.md`](./dex-env.md) after liquidity + quote validation — **no redeploy** to flip markets from “Coming Soon” to active. Optionally still change `shared/pairs.js` defaults later for greenfield installs.

### D. Backend

- [ ] No new module required if pairs stay driven by **shared PAIRS**; optional **`GET /v1/config`** or env-backed **feature flags** for gradual rollout.
- [ ] If presale has **server-side** allowlists or signatures, add **routes + persistence** (Prisma) in a dedicated module.

### E. Frontend

- [ ] **Markets / home:** remove or gate **“Coming Soon”** for LDX pairs when `active`.
- [ ] **Swap:** ensure **LDX** appears in token presets and **default pairs** where intended; handle **chain mismatch** (user on wrong chain).
- [ ] **Presale UI** (if in-app): wallet flow, chain, contract calls, error states.
- [ ] **Analytics / links:** block explorer, official announcement URLs (optional).

### F. Legal, brand, ops

- [ ] Jurisdictional / **disclaimer** copy (product + docs) as required by your counsel.
- [ ] **Runbooks:** deploy order, rollback, emergency pause (if contract supports it).

---

## Milestones (suggested)

| Milestone | Outcome |
|-----------|---------|
| **P2-M1** | Production ERC-20 + tests; deploy + verify on launch chain; addresses in `shared`. |
| **P2-M2** | Presale/launch path live (on-chain + minimal UI or partner flow). |
| **P2-M3** | **DEX** liquidity seeded; **0x** quotes succeed for **LDX/USDT** (and next pairs) on the swap API only. |
| **P2-M4** | `shared/pairs.js` LDX rows **active**; markets + swap UX updated; smoke tests documented. |

---

## Acceptance criteria (Phase 2 “done”)

- [ ] **LDX** contract is **live** on the chosen network(s) with **documented** address(es).
- [ ] **At least one** LDX pair (e.g. **LDX/USDT**) is **tradable** through the existing **DEX swap flow** (**0x** / external liquidity only) on that network — not via a CEX/internal matcher.
- [ ] **LDX/ETH** and **LDX/BNB** are **active** only when the same bar is met on those chains; otherwise remain **coming soon** with a clear internal note.
- [ ] **Shared** package is the **single source of truth** for pair status and token addresses consumed by **backend** and **frontend**.

---

## Dependencies and risks

| Risk | Mitigation |
|------|------------|
| **No AMM pool → no 0x quote** (e.g. LDX before Pancake LP) | **Expected:** seed liquidity on **PancakeSwap** (or other venues 0x aggregates on that chain) first; then re-test quotes — often **no Lidex code change** needed. |
| 0x still does not route after LP | Validate **swap** quotes **before** flipping `coming_soon`; confirm 0x supports those pools on that chain; add monitoring. |
| **Mixing 0x with CEX** | Keep **0x** only on **`requireDexMode`** swap routes; **CEX** = **internal liquidity only** — document in code reviews ([`architecture.md`](./architecture.md) §3). |
| Wrong chain / wrong token address | Automated checks + explorer verification; align `wagmi` chains with launch. |
| Placeholder LDX address in repo | Replace **before** mainnet launch; treat testnet vs mainnet explicitly. |
| Presale / custody **compliance** | Engage counsel; **DEX** (self-custody + 0x) vs **CEX** (internal) may have **different** disclosure and licensing — keep narratives **separate**. |

---

## After Phase 2

Track completion in [`phase-2-tracking.md`](./phase-2-tracking.md), then proceed to **Phase 3** (custodial + orderbook) per [`vision.md`](./vision.md). Update **this** plan with **dates**, **tx hashes**, and **deployment links** as you execute.

---

## Related docs

| Document | Use |
|----------|-----|
| [`vision.md`](./vision.md) | Phases 1–8 roadmap |
| [`phase-1-tracking.md`](./phase-1-tracking.md) | Close Phase 1 before heavy Phase 2 build |
| [`architecture.md`](./architecture.md) | API, auth, mode, swap paths |
| [`phase-1-plan.md`](./phase-1-plan.md) | What Phase 1 already delivered |
