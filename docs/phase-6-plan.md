# Phase 6 — Multi-chain expansion

**Vision anchor:** [`vision.md`](./vision.md) → *Phase 6 — multi-chain expansion*.  
**Architecture anchor:** [`architecture.md`](./architecture.md) §3 (DEX vs CEX split).

**Phase 6 stance (chosen):** **Option A — independent liquidity per chain**.  
No cross-chain pooling or bridge in v1 Phase 6; users **switch chains** to trade on each chain’s DEX liquidity.

---

## Goals

- **Multi-chain trading (DEX):** swap on multiple EVM chains using 0x routing.
- **Chain switching:** clear UX and reliable state resets on chain change.
- **Token config readiness:** LDX and core quote assets are configured per chain (addresses + decimals), so LDX pairs can be enabled per chain as liquidity appears.

---

## Non-negotiables

- **DEX remains external liquidity only:** all swaps go through 0x.
- **CEX remains internal ledger:** CEX balances and the internal matcher are **not** chain-scoped in Phase 6.
- **No bridge in v1:** “cross-chain liquidity” means *independent liquidity per chain* + chain switching UX.

---

## Milestones

### P6-M1 — Chain selector + swap state hygiene

- Swap UI supports chain selection across:
  - BNB Chain (56), Ethereum (1), Polygon (137), Avalanche (43114), Arbitrum (42161)
- On chain change:
  - token presets update to the selected chain
  - stale quote/allowance state is cleared
  - “wallet chain mismatch” guidance is shown when needed

### P6-M2 — Per-chain token configuration (LDX + quotes)

- Token presets include the required chains.
- LDX token address/decimals are defined per chain (where deployed), plus a stable quote asset per chain.
- Pair activation is per-chain and remains **configuration-driven** (no code deploy).

### P6-M4 — Option A execution (no bridge)

- Documented operational stance: liquidity is **per chain**, not cross-chain pooled.
- UX and docs clarify that “switch chain to trade on that chain’s liquidity.”

---

## Out of scope (Phase 6 v1)

- Cross-chain bridging / canonical liquidity pools
- Shared liquidity across chains
- Multi-chain CEX ledger settlement

