# Phase 6 — tracking (multi-chain expansion)

Execute per [`phase-6-plan.md`](./phase-6-plan.md).

---

## Progress log

- **2026-04-03 — P6 planning:** Chosen **Option A** (independent liquidity per chain; no bridge in v1).

---

## Workstreams

### A — DEX multi-chain trading

- [ ] Verify swap quote/execute works on: **BSC (56)**, **ETH (1)**, **Polygon (137)**, **Avalanche (43114)**, **Arbitrum (42161)**
- [ ] Confirm per-chain explorer links and chain names display correctly

### B — Chain switching UX

- [x] Swap page has an obvious chain selector
- [x] Chain change resets stale quote/allowance state reliably
- [ ] Wallet chain mismatch prompts user to switch wallet network

### C — Token configuration (P6-M2)

- [ ] LDX address + decimals configured per chain (where deployed)
- [x] Quote assets configured per chain (USDT/USDC/etc. as needed) — added aliases for `ETH`, `MATIC`, `AVAX` and USDT on Avalanche in `shared/tokens/phase1.js`.
- [ ] Per-chain pair enablement documented (ties to `shared/pairs.js` + existing DEX env toggles)

### D — Cross-chain liquidity stance (Option A)

- [x] Docs make it explicit: **liquidity is per-chain**; “cross-chain” is **switching**, not bridging
- [ ] No bridge dependencies added in Phase 6 v1

---

## Milestones

| ID | Status | Notes |
|----|--------|--------|
| P6-M1 | ☑ | Chain selector + swap state hygiene |
| P6-M2 | ☐ | Per-chain token config (LDX + quotes) |
| P6-M4 | ☑ Option A | Independent liquidity per chain (no bridge in v1) |

