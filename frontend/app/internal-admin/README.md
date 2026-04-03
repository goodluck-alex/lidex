# Internal admin console (Phase E)

Routes live at **`/internal-admin`** in the main Next app. They call the same **`/v1/admin/*`** HTTP API as curl; nothing uses `NEXT_PUBLIC_*` for secrets.

## Environment (frontend `.env.local`)

| Variable | Required | Notes |
|----------|----------|--------|
| `ADMIN_API_KEY` | Yes (for data/mutations) | Must be one of the backend admin secrets (legacy single key, or any entry in `ADMIN_API_KEYS_JSON`, typically **`super`** or a role-scoped key). For **audit log only**, a key with role **`audit_read`** is enough. **Never** prefix with `NEXT_PUBLIC_`. |
| `INTERNAL_ADMIN_UI_PASSWORD` | Yes in **production** | Separate gate for “who may open this UI” (not sent to the Lidex API). |
| `NEXT_PUBLIC_BACKEND_URL` | Usually | Defaults to `http://localhost:4000`. |
| `BACKEND_URL` | Optional | Server-only URL if the API is reached differently than the browser (e.g. Docker service name). |
| `ADMIN_CONSOLE_APPROVER_KEY` | Optional | Second admin secret sent as `X-Admin-Approver-Key` on listing approve/reject (dual-control audit fingerprint). Must be a **different** key than `ADMIN_API_KEY`. |

## Auth flow

1. **Browser** → UI password (if configured) → Server Action sets httpOnly **`lidex_ia`** cookie.
2. **Next server** → `Authorization: Bearer <ADMIN_API_KEY>` on requests to the backend.

Audit rows for POST/PATCH/DELETE still come from the backend’s admin audit middleware.

## Screens

- Mutation audit log (read-only; `GET /v1/admin/audit-logs`; **`audit_read`** or **`super`** key)
- Listings applications (read-only table)
- DEX pair activations (list, upsert, delete)
- Launchpad sales (list, create, patch)
- Liquidity mining campaigns (list, create, patch)
- Governance signals (list, create, patch)

## Development without UI password

If `NODE_ENV` is not `production` and `INTERNAL_ADMIN_UI_PASSWORD` is unset, middleware does **not** require the cookie. Restrict to trusted networks; set a UI password for any shared or deployed environment.
