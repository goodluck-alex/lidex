# DEX environment config (pairs & optional pool registry)

When **AMM liquidity** exists (e.g. PancakeSwap on BSC), **0x** can start returning quotes **without** a new app deploy. To flip **markets / “Coming Soon”** UI and API lists from **`coming_soon` → `active`**, use **`DEX_ACTIVE_PAIR_SYMBOLS`** (restart) **and/or** the **`dex_pair_activations`** table via the admin API (**no restart**).

Full liquidity model: [`architecture.md`](./architecture.md) §3.

---

## `DEX_ACTIVE_PAIR_SYMBOLS`

- **Format:** comma-separated symbols, same as [`shared/pairs.js`](../shared/pairs.js) (e.g. `LDX/USDT`, `LDX/BNB`, `LDX/ETH`).
- **Effect:** each listed symbol is **moved from `comingSoon` to `active`** in **`GET /v1/markets/pairs`**, **`GET /v1/markets/stats`** (derived), and **`GET /v1/pairs`**.
- **Implementation:** [`backend/lib/dexPairsFromEnv.js`](../backend/lib/dexPairsFromEnv.js).
- **Alias:** `ACTIVE_DEX_PAIR_SYMBOLS` (same behavior).

If a symbol is not in `comingSoon`, the server logs a warning and ignores it.

---

## `dex_pair_activations` (DB, merged at request time)

- **Default:** active rows in **`dex_pair_activations`** are **unioned** with `DEX_ACTIVE_PAIR_SYMBOLS` when building phase-1 pairs ([`backend/lib/dexPairsFromEnv.js`](../backend/lib/dexPairsFromEnv.js)).
- **Disable DB merge:** `DEX_PAIR_DB_ACTIVATION_ENABLED=false` (env-only behavior).
- **Admin API** (same **`ADMIN_API_KEY`** as listings):
  - `GET /v1/admin/dex-pairs/activations`
  - `POST /v1/admin/dex-pairs/activations` — body `{ "symbol": "LDX/USDT", "active": true, "note": "optional" }`
  - `DELETE /v1/admin/dex-pairs/activations?symbol=LDX%2FUSDT`

Symbols must still exist under **`comingSoon`** in [`shared/pairs.js`](../shared/pairs.js) (otherwise you only get a server warning and no visible promotion).

### Phase 7 note (token listings)

Phase 7 introduces a public token listing pipeline:

- Applicants submit to **`POST /v1/listings/apply`**.
- Approved tokens are exposed to the app via **`GET /v1/tokens/list?chainId=...`**.
- Markets UI shows approved tokens as **`TOKEN/LDX (Coming Soon)`** per chain.

**Activation:** use **`DEX_ACTIVE_PAIR_SYMBOLS`** and/or a row in **`dex_pair_activations`** (via admin API).

- Only promote a `TOKEN/LDX` (or other listed pair) once on-chain liquidity exists and **0x returns a routable quote** for that pair on that chain.

---

## `DEX_POOL_*` (optional)

Record **AMM pool / pair contract** addresses for your own ops (runbooks, future health checks). **0x does not read these** for `/v1/swap/quote`.

**Pattern:** `DEX_POOL_<CHAIN>_<BASE>_<QUOTE>=0x...`

Examples (BSC):

```env
DEX_POOL_BSC_LDX_USDT=0xYourPancakePairAddress
DEX_POOL_BSC_LDX_BNB=0x...
DEX_POOL_BSC_LDX_ETH=0x...
```

Use **`BNB`** in the env key when the product pair is **LDX/BNB** (the on-chain pool may use **WBNB**).

At startup, the backend logs how many pool entries were parsed.

---

## Order of operations

1. Add liquidity on **Pancake** (or other venues **0x aggregates** on that chain).
2. Confirm a **swap quote** in the app (or via 0x API) for the LDX leg.
3. Promote the pair: set **`DEX_ACTIVE_PAIR_SYMBOLS`** and restart, **or** `POST /v1/admin/dex-pairs/activations` (no restart). Optionally record **`DEX_POOL_*`**.
4. Markets/home show pairs as **active**; swap already uses token addresses from **`@lidex/shared`** — no extra “pool address” is required for **0x** routing.

---

## Related

- [`deployments.md`](./deployments.md) — LDX token address
- [`phase-2-plan.md`](./phase-2-plan.md) — Phase 2 workstreams
