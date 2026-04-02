# Backend modules (scaffold)

Each feature lives under `backend/modules/<feature>/` with four files:

- `<feature>.routes.js`: route declarations (method + path)
- `<feature>.controller.js`: request handlers (thin)
- `<feature>.service.js`: business logic
- `<feature>.model.js`: data normalization / DB helpers

## Modules included

- `auth`: login/logout/me
- `swap`: quote/execute (DEX swap API)
- `trade`: pairs/orderbook/orders (CEX orderbook API)
- `wallet`: balances/portfolio/deposit/withdraw/transfer (custodial + non-custodial views)
- `referral`: link/stats/users
- `staking`: pools/positions/stake/unstake

## Wiring suggestion (when you add Express)

1. Create an Express app in `backend/app.js`
2. For each module, mount routes like:
   - `POST /swap/quote` → `swap.controller.quote`
3. Add shared middleware:
   - auth (JWT/session)
   - rate limiting
   - error handler

`backend/modules/index.js` exports the route arrays so you can auto-register routes.

