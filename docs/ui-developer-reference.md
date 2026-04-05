# UI copy — developer & rollout reference

End-user pages intentionally avoid build-phase labels, env-var names, and raw API paths. Use this note for operators and engineers.

## Mode names (product)

- **DEX Lite** / **CEX Full** — navigation and `lidex_mode` cookie; CEX-only routes redirect in DEX mode.

## Trade (`/cex/trade`)

- Layout: desktop three-column dashboard; mobile uses tabs (chart, order book, balances, order, orders, history).
- **Matcher:** limit orders use the internal matcher for the API-configured pair (default `LDX/USDT`). No 0x on this path.
- **Dev / paper:** `CEX_DEV_FUNDING`, `CEX_PAPER_TRANSFERS`, `POST /v1/cex/dev/fund` when dev funding is enabled.
- **Stop-limit:** off-book until last internal trade crosses the stop; then posts the limit. **Market:** IOC. Min notional applies to limits and executed market size.
- **Chart:** `GET /v1/markets/candles` — requires backend; reference klines may be live or synthetic.
- **Balances panel:** pool matching `CEX_POOL_MATCHING_ENABLED`; simulated deposit/withdraw toggled via API features.
- **Order book:** click depth / best bid-ask / last trade to prefill limit price in the order panel.

## Swap (`/dex/swap`)

- Routing via **0x** (phase-1 baseline). CEX mode uses the same swap engine; optional extra panels may appear.
- Unsupported networks: primary rollout target is BSC unless configured otherwise.

## Markets (`/markets`)

- Pair list from Lidex API; optional **reference** USD snapshot enrichment via Next route `POST /api/markets/coingecko/enrich` (mapped bases only).

## Referral (`/referral`)

- Phase-1 referral model: tiers L1/L2/L3, ledger entries, direct referrals after wallet login attach.

## Listings (`/listings/apply`)

- Phase 7 listing flow; **Phase 6 Option A** = per-chain liquidity (no cross-chain bridge in v1). TOKEN/LDX track and automation rules live in ops docs.

## Presale (`/presale`)

- Phase 2 surface: LDX presale, BSC-focused copy in UI; contract/env from backend.

## Launchpad (`/launchpad`)

- `LAUNCHPAD_ENABLED=true`; custodial quote purchase, internal offer asset credit. Admin: `POST /v1/admin/launchpad/sales` with `ADMIN_API_KEY`.

## Margin (`/margin`)

- `MARGIN_ENABLED`, `MARGIN_MAX_LEVERAGE`, `MARGIN_MAINTENANCE_BPS`, isolated v0 synthetic exposure.

## Wallet (`/wallet`)

- CEX: custodial + Web3; DEX: Web3 only. Wallet-signature login ties to the session user system.

## Governance (`/governance`)

- Admin creates signals via `POST /v1/admin/governance/signals` with `ADMIN_API_KEY`. `powerBasis`: `cex_ldx_available` or `cex_ldx_staked`.

## Internal admin (`/internal-admin`)

- Server-gated console; `ADMIN_API_KEY` never exposed to the browser. See `admin/README.md` and `docs/admin-*.md`.

## Docs page (`/docs`)

- In-app **Help** route should stay end-user oriented; this file holds implementation and phase mapping for developers.
