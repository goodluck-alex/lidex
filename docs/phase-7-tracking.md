# Phase 7 — tracking (token listing ecosystem)

Execute per [`phase-7-plan.md`](./phase-7-plan.md).

---

## Progress log

- **2026-04-03 — P7-M1:** Public listing apply flow + approved token registry endpoints (no admin UI).
- **2026-04-03 — P7-M3+:** DB `dex_pair_activations` merged with `DEX_ACTIVE_PAIR_SYMBOLS`; admin CRUD under `/v1/admin/dex-pairs/activations`.

---

## Workstreams

### A — Public listing application

- [x] `POST /v1/listings/apply` stores submissions in `token_listing_applications`
- [x] Optional **automated TOKEN/LDX listing** when `LISTING_AUTO_LDX_ENABLED=true`: reads ERC-20 `totalSupply` / `symbol` / `decimals`, enforces `LISTING_MIN_TOTAL_SUPPLY_RAW`, upserts `listed_tokens` (status `auto_listed`) or marks `auto_rejected` with `automation_note`
- [x] **Admin / ops:** optional `POST` webhook `LISTING_ADMIN_WEBHOOK_URL` on every successful apply; HTTP API under `/v1/admin/listings/*` with `ADMIN_API_KEY` ([`admin/middleware.js`](../admin/middleware.js))
- [x] Rate limiter for apply flow (`RATE_LIMIT_LISTING_APPLY_MAX`)
- [x] Public UI page `/listings/apply` with “pair with LDX” incentive copy

### B — Approved token registry

- [x] DB `listed_tokens` table exists (populated by admin department workflow)
- [x] `GET /v1/tokens/list?chainId=...` returns approved tokens per chain

### C — `TOKEN/LDX` markets surfacing (P7-M2)

- [x] Markets UI shows `TOKEN/LDX` as Coming Soon per chain (from token list)
- [x] Activation policy documented (liquidity on-chain + 0x routable) — see `phase-7-plan.md` + `dex-env.md`

### D — Activation runbook (P7-M3)

- [x] Document “Coming Soon → Active” rule and required checks
- [x] **Hybrid activation:** `DEX_ACTIVE_PAIR_SYMBOLS` **or** DB `dex_pair_activations` merged at runtime (`DEX_PAIR_DB_ACTIVATION_ENABLED`, admin `/v1/admin/dex-pairs/activations`) — see [`dex-env.md`](./dex-env.md)

---

## Milestones

| ID | Status | Notes |
|----|--------|--------|
| P7-M1 | ☑ | Apply + storage + public token registry (no admin UI) |
| P7-M2 | ☑ | Markets UI shows `TOKEN/LDX` Coming Soon per chain (from approved token list) |
| P7-M3 | ☑ | Activation policy + runbook (no admin UI) |

---

## Phase 7 backlog (optional / later)

Items below are **not** required to close P7-M1–M3 as scoped in [`phase-7-plan.md`](./phase-7-plan.md); they are follow-ups if you want a deeper listing + liquidity story.

- **Liquidity:** automatic on-chain verification that a pool exists / depth thresholds (currently ops + manual checks per [`dex-env.md`](./dex-env.md)).
- **“Provide liquidity” product:** in-app wizard, DEX “add liquidity” deep links, or checklist tied to a listing id (v1 assumes teams use external AMMs).
- **Symbol / pair registry:** when adding real `TOKEN/LDX` markets, ensure product symbols align with [`shared/pairs.js`](./shared/pairs.js) (and related stats) so Coming Soon / active UIs stay consistent.
- **Ongoing ops:** only promote pairs after on-chain liquidity and a routable **0x** quote; use env (restart) and/or admin DB activations (no restart).

---

## Outside Phase 7

**Phase 5 (staking):** CEX taker fees and DEX swap referral shares consume staking tiers in code (`effectiveTakerFeeBpsForUser`, `effectiveReferralBoostBpsForUser`); detailed Phase 5 docs can be added separately.

