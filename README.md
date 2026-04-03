# Lidex — Hybrid Exchange UI Framework (DEX Lite + CEX Full)

**Repository:** [github.com/goodluck-alex/lidex](https://github.com/goodluck-alex/lidex)

This repository scaffolds a **hybrid exchange** with two UI modes:

- **DEX Mode (Lite)**: non-custodial, minimal, swap-focused.
- **CEX Mode (Full)**: custodial + non-custodial, advanced trading (orderbook), staking, launchpad.

## Repo structure (clone root)

```
├── frontend/          # Next.js (UI + mode switching); talks to backend over HTTP
├── backend/           # Node.js/Express — **the only API server** (public + CEX + `/v1/admin/*`)
├── admin/             # Operator package (authz + audit middleware); routes mount in `backend/server.js`
├── contracts/         # Solidity (Hardhat)
├── scripts/           # Deployment / tooling
├── shared/            # Shared constants, chains, tokens, pairs (`@lidex/shared`)
├── docs/              # Vision, phase plans, architecture, admin API
├── tests/             # Unit / integration tests
├── docker-compose.yml # Optional local PostgreSQL
├── package.json       # Workspace root
└── README.md
```

## Modes (Lite vs Full)

The UI exposes features based on the active mode:

| Section | DEX (Lite) | CEX (Full) |
|---|---:|---:|
| Swap | ✅ | ✅ (can include advanced panels) |
| Trade (Orderbook) | ❌ | ✅ |
| Markets | ✅ | ✅ |
| Wallet | ✅ (non-custodial only) | ✅ (custodial + non-custodial) |
| Referral | ✅ | ✅ |
| Staking | ❌ | ✅ |
| Launchpad | ❌ | ✅ |
| Settings | ✅ | ✅ |
| Help/Docs | ✅ | ✅ |

See `docs/ui-framework.md` for page-by-page details and layout guidance.

**North star:** `docs/vision.md` (phases 1–8). **System map:** `docs/architecture.md` — DEX settlement uses **0x / external liquidity only**; CEX uses the **internal matcher and ledger** (no 0x on CEX fills). **Live LDX (BSC):** `docs/deployments.md`. **DEX pair toggles without redeploy:** `docs/dex-env.md` (`DEX_ACTIVE_PAIR_SYMBOLS`, optional `DEX_POOL_*`, DB `dex_pair_activations`).

### Phases 2–8 — what this tree implements

| Phase | Theme | Plan / tracking | Implemented highlights |
|------:|--------|-----------------|-------------------------|
| **2** | LDX launch surface | [`phase-2-plan.md`](docs/phase-2-plan.md) · [`phase-2-tracking.md`](docs/phase-2-tracking.md) | LDX metadata in `@lidex/shared` (`shared/tokens/ldx.js`), presale/overview API + UI hooks (`/v1/presale`, `/presale`); on-chain quotes still need AMM liquidity for LDX pairs |
| **3** | Custodial CEX + orderbook | [`phase-3-plan.md`](docs/phase-3-plan.md) · [`phase-3-tracking.md`](docs/phase-3-tracking.md) · [`cex-compliance-and-ops.md`](docs/cex-compliance-and-ops.md) | `backend/modules/cex/*`, Prisma balances / orders / trades / ledger, `/v1/cex/*`, trade UI, custodial wallet + on-chain bridge |
| **4** | Internal liquidity engine | [`phase-4-plan.md`](docs/phase-4-plan.md) · [`phase-4-tracking.md`](docs/phase-4-tracking.md) | Internal LP pools (add/remove), optional pool–matcher routing for market/limit, LP reward accrual + claim (env-gated) |
| **5** | Staking & tiers | `docs/vision.md` § Phase 5 | `backend/modules/staking/*`, `/v1/staking/*`, `/staking` UI; ties to referral boost / launchpad gates where configured |
| **6** | Multi-chain footprint | [`phase-6-plan.md`](docs/phase-6-plan.md) · [`phase-6-tracking.md`](docs/phase-6-tracking.md) | Per-chain token presets (`shared/tokens/phase1.js`, `/v1/tokens/presets`), swap chain selector; **Option A** = independent liquidity per chain (no bridge in v1) |
| **7** | Token listing ecosystem | [`phase-7-plan.md`](docs/phase-7-plan.md) · [`phase-7-tracking.md`](docs/phase-7-tracking.md) | `POST /v1/listings/apply`, registry `GET /v1/tokens/list`, optional auto-list (`LISTING_AUTO_LDX_*`), `/listings/apply`, markets **TOKEN/LDX** rows + metadata; admin DEX pair activations |
| **8** | Advanced hybrid | [`phase-8-plan.md`](docs/phase-8-plan.md) · [`phase-8-tracking.md`](docs/phase-8-tracking.md) | CEX launchpad (`/launchpad`), liquidity mining campaigns, governance **signals** (`/governance`), advanced orders (post-only, `clientOrderId`, cancel-all), **isolated margin v0** (off by default; ops/legal gate) |

**Operator console:** internal UI at `/internal-admin` (server-side `ADMIN_API_KEY`); HTTP reference [`docs/admin-api.md`](docs/admin-api.md), roles [`docs/admin-authz.md`](docs/admin-authz.md), roadmap [`docs/admin-plan.md`](docs/admin-plan.md).

**Phase 1** baseline (swap, referral, markets): [`phase-1-plan.md`](docs/phase-1-plan.md) · [`phase-1-tracking.md`](docs/phase-1-tracking.md).

## Getting started (after dependencies are added)

This scaffold is runnable. Install once at the **repository root**:

```bash
npm install
```

Then run:

```bash
npm run dev:frontend
```

Frontend dev server (default): `http://localhost:3001`

### Primary routes (mode split)

- **DEX swap (0x)**: `http://localhost:3001/dex/swap` (legacy `/swap` redirects)
- **CEX trade dashboard**: `http://localhost:3001/cex/trade` (legacy `/trade` redirects)

### Environment variables

- **Frontend**: copy `frontend/.env.local.example` to `frontend/.env.local`
  - `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:4000`)
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (recommended for WalletConnect in RainbowKit)

- **Backend**: copy `backend/.env.example` to `backend/.env`
  - `DATABASE_URL` — PostgreSQL connection string (Prisma). Example in `.env.example`.
  - After Postgres is running: `cd backend && npm run db:migrate` (or `npm run db:push` for quick local sync).
  - Optional local DB: from repo root, `docker compose up -d` (matches default user/db/password in `.env.example`).
  - `APP_PUBLIC_URL` — origin of the Next app (no trailing slash); used for **referral share links** (`/?ref=…`)
  - `OX_API_KEY` and swap fee vars for 0x (see example file)

**0x networks:** Phase 1 targets **mainnet-style** chains (e.g. BSC) by default. For a strict “testnet first” rollout, point 0x + token lists at testnets in config and env — not a separate code path yet.

**Persistence:** the backend uses **PostgreSQL** via Prisma for users, referral attachments, referral ledger entries, and auth sessions. Ensure `DATABASE_URL` is set and migrations are applied before `npm run dev:backend`.

### Settings ↔ swap

`/settings` persists **slippage**, **deadline**, **gas preference**, and **theme** in `localStorage`. **`/dex/swap`** loads default slippage from the same store and updates when you change it in Settings (or on blur when editing slippage on the swap page).

### Tests

```bash
npm test
```

See `tests/README.md` for what runs today (includes referral level helper unit tests).

### Backend API (referral)

- `GET /v1/referral/link` — share URL (guest or authed)
- `GET /v1/referral/stats` — stats + ledger slice + `referredUsers` when logged in
- `GET /v1/referral/users` — **401** if not logged in; same direct-referral list as `stats.referredUsers`

```bash
npm run dev:backend
```

