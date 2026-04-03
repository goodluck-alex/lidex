# Phase 8 — Advanced hybrid features

**Vision anchor:** [`vision.md`](./vision.md) → *Phase 8 — advanced hybrid features*.  
**Architecture anchor:** [`architecture.md`](./architecture.md) §3 (DEX vs CEX split — new surfaces must preserve the hard boundary).

---

## Goal

After Phases 1–7 are stable in production, expand Lidex with **growth and power-user** capabilities: launchpad, deeper CEX trading, incentives, and community governance—**without** blurring DEX (0x / wallet) vs CEX (custodial / internal) execution.

---

## Non-negotiables

- **DEX execution:** non-custodial swaps stay **0x-only** (external liquidity). Phase 8 must not route wallet swaps through internal books or bridge CEX inventory into the DAP swap path without an explicit product decision and doc update.
- **CEX execution:** custodial flows stay **internal matcher / internal LP** as today; any “advanced orderbook” work extends **this** side, not 0x.
- **Compliance / ops:** each new surface (launchpad, governance, margin if ever shipped) needs its own risk, disclosure, and ledger story—see [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md) for CEX patterns.

---

## Vision bucket (from vision.md)

| Theme | Examples |
|--------|----------|
| **Launchpad** | Token sales / allocations tied to LDX or stake tiers, participation caps, settlement rules |
| **Advanced orderbook** | More CEX order types (e.g. IOC-only variants already exist—expand: post-only, reduce-only, etc.), depth API, institutional hooks |
| **Margin trading** | *Optional / future* — leverage, liquidation, risk engine; highest complexity |
| **Liquidity mining** | Incentive programs (beyond internal LP rewards)—metrics, claims, anti-gaming |
| **Governance** | Parameter votes, signaling, treasury direction—often snapshot + off-chain first |

---

## Proposed milestones (pick order after business priority)

> Milestone IDs are **planning placeholders** until you prioritize; not all need to ship in one release.

### P8-M1 — Launchpad v1 (spec + MVP)

- **Shipped (v1):** fixed-price tranche with **CEX internal settlement** — users pay **quote** custodial balance (`CEX_QUOTE_ASSET`), receive **offer** asset as internal balance; optional **min staking tier rank**; admin CRUD via `ADMIN_API_KEY`; flags **`LAUNCHPAD_ENABLED`**.
- **Still deployment-specific:** KYC/geo, refund rules, withdrawal/redeem of offer tokens, on-chain sale contracts.

### P8-M2 — Liquidity mining / incentives v1

- **Shipped (v1):** `LiqMiningCampaign` boosts **CEX internal LP reward emission** over time windows (`multiplierBps`, optional `poolSymbol`, piecewise accrual). **`LIQ_MINING_ENABLED`**; public `GET /v1/cex/liquidity/mining-campaigns`; admin `GET|POST /v1/admin/liq-mining/campaigns`, `PATCH .../:id`.
- **Still optional / future:** tier-gated multipliers, dedicated ledger kinds for campaign attribution, UI polish.

### P8-M3 — Governance v0

- **Shipped (v1):** **Signaling polls** — `GovSignalProposal` / `GovSignalVote`; weight = **`cex_ldx_available`** (CEX `CEX_STAKE_ASSET` avail+locked) or **`cex_ldx_staked`** (default stake pool). **`GOVERNANCE_SIGNAL_ENABLED`**; public `GET /v1/governance/signals`, `GET .../:slugOrId`, `POST .../:slugOrId/vote`; admin `GET|POST /v1/admin/governance/signals`, `PATCH .../:id`; `/governance` UI. Non-binding (no on-chain execution).
- **Still optional:** parameter automation; snapshot-at-block semantics; richer choice types.

### P8-M4 — Advanced CEX trading (non-margin)

- **Shipped (v1 extension):** **Post-only** limit orders were already enforced in the matcher; `postOnly` is now **persisted** on `CexOrder`. Optional **`clientOrderId`** (unique per user, 64 chars) on place order; **409** if duplicate. **`GET /v1/cex/orders`** supports `status` (`all` | `active` | `open` | `resting` | `closed`), `orderType`, `bookOnly` (exclude `internal_pool`). **`POST /v1/cex/orders/cancel-all`** cancels open/partial/pending_stop (non-pool). Trade UI: client order id field, cancel-all, best-effort **cancel on tab leave** (`pagehide` + `fetch` keepalive).
- **Still optional / future:** authenticated WebSocket, strict snapshot-idempotency, reduce-only, other order flags.

### P8-M5 — Margin / leverage (*explicitly optional*)

- **Shipped (v0 scaffold):** **`CexMarginPosition`** — isolated long/short on `CEX_MATCHER_SYMBOL`, **quote collateral** only, **synthetic** base size at open (`size = collateral×leverage / mark`). Mark = last internal trade or book mid. **Maintenance** = `MARGIN_MAINTENANCE_BPS` on mark notional; **sweep liquidates** underwater positions. **`MARGIN_ENABLED`** default **false**; caps: `MARGIN_MAX_LEVERAGE`, `MARGIN_MIN_COLLATERAL_QUOTE`, `MARGIN_MAX_OPEN_PER_USER`. APIs: `GET /v1/cex/margin/positions`, `POST /v1/cex/margin/open`, `POST /v1/cex/margin/close`; **`/v1/cex/config`** includes `margin`. Ledger: `margin_collateral_lock`, `margin_close`, `margin_liquidation`.
- **Not production-complete:** no insurance fund accounting, no cross margin, no on-chain hedges, mark is internal only — **requires product, risk, and legal review** before real leverage users.

---

## Out of scope until decided

- Full **cross-chain** CEX netting (Phase 6 Option A assumed independent per-chain).
- Replacing **0x** on DEX with proprietary routers (would be a new architecture phase).

---

## Dependencies

- Strong **Phase 7** listing + activation discipline (real liquidity before “active”).
- **Phase 5** staking/tiers stable (benefits already wired for fees / referrals).
- **Ops:** admin APIs and runbooks from prior phases.
