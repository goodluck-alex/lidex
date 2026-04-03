# Phase 7 — Token listing ecosystem (LDX-paired growth)

**Vision anchor:** [`vision.md`](./vision.md) → *Phase 7 — token listing ecosystem*.  
**Architecture anchor:** [`architecture.md`](./architecture.md) §3 (DEX vs CEX split).

---

## Goal

Enable projects to **apply** to list tokens across supported chains, with an explicit incentive to **pair with LDX** (e.g. `TOKEN/LDX`) to increase LDX demand and liquidity depth.

---

## Non-negotiables

- **No admin UI in the public app:** admin department tooling lives in a separate folder / surface.
- **DEX trading stays external (0x):** listings do not add internal DEX routing; pairs become “active” when 0x can route liquidity.
- **Phase 6 Option A continuity:** liquidity is **per-chain** (no bridge in v1).

---

## Scope (v1)

### P7-M1 — Public listing application + approved token registry (no admin UI)

- `POST /v1/listings/apply`: accept project submissions (chainId + tokenAddress + symbol + decimals + metadata).
- DB tables:
  - `token_listing_applications` (submissions)
  - `listed_tokens` (approved registry; initially empty until admin processes)
- `GET /v1/tokens/list?chainId=...`: public list of **approved** tokens per chain (for UI and integrations).
- Copy includes incentive: **free listing when paired with LDX**.

### P7-M2 — Surface `TOKEN/LDX` markets (Coming Soon)

- UI lists “Coming Soon” markets derived from `GET /v1/tokens/list`:
  - `TOKEN/LDX` (per chain)
- Activation remains separate (liquidity must exist + 0x route); use **env** (`DEX_ACTIVE_PAIR_SYMBOLS`) and/or **DB** (`dex_pair_activations` via admin API).

### P7-M3 — Activation policy (Coming Soon → Active)

**Purpose:** define a consistent, ops-friendly rule for when a `TOKEN/LDX` market becomes tradable.

- **Source of truth for eligibility:** the token must be **approved** (appears in `GET /v1/tokens/list?chainId=...`).
- **Source of truth for activation:** DEX markets are activated via **`DEX_ACTIVE_PAIR_SYMBOLS`** and/or DB **`dex_pair_activations`** merged at runtime (see [`dex-env.md`](./dex-env.md)).
- **Operational rule:** only activate when:
  - on-chain liquidity exists for the pair on that chain (AMM or venue 0x aggregates),
  - 0x returns a routable quote for the pair (app quote succeeds),
  - and the symbol has been verified (symbol/decimals/address match the approved registry and chain).
- **LDX pairing incentive:** default listing path is `TOKEN/LDX`; if a project requests a non-LDX quote, treat it as an exception flow.

---

## Out of scope (later)

- Admin review UI / workflows (handled by separate admin folder)
- Automatic on-chain liquidity verification
- CEX multi-symbol matcher support for arbitrary `TOKEN/LDX` (keep CEX single-pair until explicitly expanded)

