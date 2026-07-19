# API surface

Base URL: `/api/v1`

## Public

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /health`
- `GET /trading/markets`
- `GET /blockchain/bsc/ldx/:address/balance`
- `GET /blockchain/bsc/transactions/:hash`

## Bearer-authenticated

- `POST /auth/logout`
- `GET /users/me`
- `GET /users/me/sessions`
- `GET|POST /wallets`
- `GET /wallets/exchange-account`
- `GET /wallets/transactions`
- `GET|POST /trading/orders`
- `GET /rewards/summary`
- `GET /rewards/history`
- `POST /rewards/check-in`
- `GET /rewards/leaderboard`
- `GET /referrals/me`
- `GET|POST /staking`
- `GET /staking/summary`
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `GET /settings/defaults`

Swagger is mounted at `/docs` when `NODE_ENV` is not `production`.
