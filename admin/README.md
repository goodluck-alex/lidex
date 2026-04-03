# `lidex/admin`

Operator **contracts and auth** for Lidex. This folder is **not** a second server.

## One backend, two clients

```
                    ┌─────────────────┐
                    │  backend/       │  Single Express API (e.g. :4000)
                    │  server.js      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      /v1/* + cookies   /v1/admin/*   (bots, curl, Retool)
      session auth       ADMIN_API_KEY
              │
       frontend/         admin/  ← this package (middleware only today;
       Next.js             routes mount in server.js)
```

- **`frontend/`** — end users: same-origin or `NEXT_PUBLIC_BACKEND_URL`; wallet session cookies; `X-Lidex-Mode` for DEX vs CEX.
- **`admin/`** — department: same `NEXT_PUBLIC_BACKEND_URL` (or internal URL); **no special server**; call `/v1/admin/*` with `Authorization: Bearer <ADMIN_API_KEY>` or `X-Admin-Key`.

## Package entry (wired to backend)

Backend loads:

```js
const { registerAdminRoutes, requireAdminApiKey } = require("../admin");
```

Auth: [`middleware.js`](./middleware.js). Routes: [`routes.js`](./routes.js) (`registerAdminRoutes` is called from [`backend/server.js`](../backend/server.js)).

**HTTP contract (all paths, query/body, errors):** [`docs/admin-api.md`](../docs/admin-api.md).

POST/PATCH/DELETE responses are recorded in **`admin_api_audit_logs`** via [`auditMiddleware.js`](./auditMiddleware.js) (no bodies).

Optional operator UI (Next.js, server-side key only): [`frontend/app/internal-admin/README.md`](../frontend/app/internal-admin/README.md).

## Configuration

[`backend/.env.example`](../backend/.env.example) — `ADMIN_API_KEY` and/or **`ADMIN_API_KEYS_JSON`** (scoped roles), optional **`ADMIN_IP_ALLOWLIST`**. Details: [`docs/admin-authz.md`](../docs/admin-authz.md).

## Security

Treat the admin key like root; rotate on staff changes; restrict `/v1/admin/*` by network where possible in production.

## Structured roadmap

Phased work (route extraction, health, audit log, read-only toolkit, optional UI, hardening): [`docs/admin-plan.md`](../docs/admin-plan.md).
