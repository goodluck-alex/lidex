# Phase 8 — tracking (advanced hybrid features)

Execute per [`phase-8-plan.md`](./phase-8-plan.md). **Status:** milestone backlog complete (M1–M5 v0); margin remains **high-risk / counsel review** before production.

---

## Progress log

- **2026-04-03 — P8-M1:** CEX launchpad v1 (fixed-price, internal settlement, staking tier gate, admin API, `/launchpad` UI).
- **2026-04-03 — P8-M2:** Liquidity mining campaigns (`LiqMiningCampaign`), piecewise LP accrual boost, `GET /v1/cex/liquidity/mining-campaigns`, admin `/v1/admin/liq-mining/campaigns`, `LIQ_MINING_ENABLED`.
- **2026-04-03 — P8-M3:** Governance signaling (`GovSignalProposal` / `GovSignalVote`), CEX-weighted polls (`cex_ldx_available` | `cex_ldx_staked`), `GOVERNANCE_SIGNAL_ENABLED`, `/governance` UI.
- **2026-04-03 — P8-M4:** CEX order API — persist `postOnly`, `clientOrderId` (unique per user), `GET /v1/cex/orders?status=&orderType=&bookOnly=`, `POST /v1/cex/orders/cancel-all`, trade UI (client id, cancel all, cancel-on-leave hook).
- **2026-04-03 — P8-M5:** Isolated margin v0 — `CexMarginPosition`, quote collateral, mark-based PnL, maintenance liquidation sweep, `MARGIN_ENABLED`, `/v1/cex/margin/*`, `/margin` UI.

---

## Milestones

| ID | Status | Notes |
|----|--------|-------|
| P8-M1 Launchpad v1 | ☑ | CEX fixed-price tranche + admin CRUD + UI ([`phase-8-plan.md`](./phase-8-plan.md)) |
| P8-M2 Liquidity mining / incentives | ☑ | Campaigns boost internal LP reward rate; pools expose multiplier / effective rate |
| P8-M3 Governance v0 | ☑ | Off-chain signaling + weighted votes; non-binding |
| P8-M4 Advanced CEX (non-margin) | ☑ | Post-only already in matcher; now persisted + bot filters + bulk cancel |
| P8-M5 Margin (optional) | ☑ | v0 synthetic isolated margin — **off by default**; not a full risk engine |

---

## Workstreams

### A — Launchpad

- [x] MVP: `LaunchpadSale` + `LaunchpadAllocation` (Prisma), `LAUNCHPAD_ENABLED`, public `/v1/launchpad/*`, admin `/v1/admin/launchpad/sales`, ledger kinds `launchpad_pay` / `launchpad_receive`
- [x] Optional **min staking tier rank** per sale; pay asset = **CEX quote** only (v1)
- [ ] Business + legal / KYC gates (deployment-specific)
- [ ] Withdraw / redeem path for offer asset (if not internal-only)

### B — Incentives / liquidity mining

- [x] `LiqMiningCampaign` + piecewise accrual in `cex.liquidity` (`LIQ_MINING_ENABLED`)
- [x] Public + admin HTTP APIs; optional `features.liqMiningEnabled` in CEX config
- [ ] Optional UI surfacing on liquidity panel; ledger line items (if needed for audits)

### C — Governance

- [x] v0 signaling: proposals + votes weighted by CEX LDX spot or staked LDX; public `/v1/governance/signals*`, admin CRUD `/v1/admin/governance/signals`
- [ ] Link to parameters (process + tooling — operational / docs only for now)

### D — Advanced CEX

- [x] `postOnly` + `clientOrderId` on `CexOrder`; list filters; `POST /v1/cex/orders/cancel-all`; optional tab-close cancel (keepalive)
- [ ] Further order types (e.g. post-only on stop activation only), WS trading API

### E — Margin (*if ever*)

- [x] v0 scaffold: isolated positions, maintenance sweep, ledger kinds `margin_*` — **enable only with ops + legal sign-off**
- [ ] Production risk engine, insurance fund, partial fills, cross margin, external mark oracles

---

## Outside Phase 8 (reminder)

Phases **1–7** remain the core path: DEX + CEX hybrid, LDX ecosystem, multi-chain, listings. Phase 8 is **incremental** on top—do not rush margin or launchpad without clearing prior phase debt.
