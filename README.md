# Lidex — Hybrid Exchange UI Framework (DEX Lite + CEX Full)

This repository scaffolds a **hybrid exchange** with two UI modes:

- **DEX Mode (Lite)**: non-custodial, minimal, swap-focused.
- **CEX Mode (Full)**: custodial + non-custodial, advanced trading (orderbook), staking, launchpad.

## Repo structure

```
lidex/
├── frontend/          # Next.js Frontend (UI + mode switching)
├── backend/           # Node.js/Express Backend (API, orderbook, referral, custodial wallet)
├── contracts/         # Solidity Smart Contracts (Hardhat)
├── scripts/           # Deployment scripts (Hardhat/Node)
├── shared/            # Shared utilities between frontend/backend
├── docs/              # Product + UI specs
├── tests/             # Test cases (frontend/backend/contracts)
├── package.json
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

## Getting started (after dependencies are added)

This scaffold is runnable. Install once at the repo root:

```bash
cd lidex
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
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (required only if you want WalletConnect)

or:

```bash
npm run dev:backend
```

