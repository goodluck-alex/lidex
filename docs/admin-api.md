# Admin operator API (`/v1/admin/*`)

Same Express process as the public API; routes are registered from [`admin/routes.js`](../admin/routes.js). Operators authenticate with **`ADMIN_API_KEY`** (legacy) or **`ADMIN_API_KEYS_JSON`** (scoped roles); see [`admin-authz.md`](./admin-authz.md).

## Mutation audit trail

Every **POST**, **PATCH**, and **DELETE** to `/v1/admin/*` appends one row to `admin_api_audit_logs` (Prisma: `AdminAuditLog`) **after** the response is sent: `method`, `path` (truncated URL, query allowed), `statusCode`, `keyFingerprint` (first 8 hex of SHA256 of the **matched** admin key, when auth succeeded), optional `resource`, optional `ip`, optional **`supportTicketId`** (header `X-Support-Ticket-Id`), optional **`approverKeyFingerprint`** (when `X-Admin-Approver-Key` matched a second key). **Request bodies are not stored.**

Set **`TRUST_PROXY=1`** in production when the app sits behind a reverse proxy so `ip` reflects the client.

---

## Authentication

| Header | Example |
|--------|---------|
| `Authorization` | `Bearer <key>` |
| `X-Admin-Key` | `<key>` |

Configure keys in the backend ([`backend/.env.example`](../backend/.env.example), [`admin-authz.md`](./admin-authz.md)).

| Condition | HTTP | Response shape |
|-----------|------|----------------|
| No keys configured | **503** | `{ ok: false, error, code: "ADMIN_DISABLED" }` |
| Invalid `ADMIN_API_KEYS_JSON` | **503** | `{ ok: false, error, code: "ADMIN_CONFIG_ERROR" }` |
| Client IP not in `ADMIN_IP_ALLOWLIST` | **403** | `{ ok: false, code: "ADMIN_IP_FORBIDDEN" }` |
| Key valid but role forbids route/method | **403** | `{ ok: false, code: "ADMIN_FORBIDDEN" }` |
| Key missing or wrong | **401** | `{ ok: false, error: "unauthorized", code: "UNAUTHORIZED" }` |

The **system status** endpoint does not require a key (see below).

---

## Endpoints

| Method | Path | Auth | Query | Body | Typical errors |
|--------|------|------|-------|------|----------------|
| GET | `/v1/admin/system/status` | no | — | — | — (always 200 JSON) |
| GET | `/v1/admin/users/by-address/:address` | yes | — | — | 404, 500 |
| GET | `/v1/admin/users/:id` | yes | `limit?` (1–200, default 50), `cursor?` (ledger entry id) | — | 404, 500 |
| GET | `/v1/admin/cex/overview` | yes | — | — | 500 |
| GET | `/v1/admin/audit-logs` | yes (**`super`** or **`audit_read`**) | `limit?` (1–500, default 50), `cursor?`, `resource?`, `method?` | — | 403, 500 |
| POST | `/v1/admin/cex/ledger/manual-adjust` | yes (super) | — | See Phase G section | 400, 403, 404, 409, 500 |
| GET | `/v1/admin/listings/applications` | yes | `status?`, `limit?` (1–200, default 50), `cursor?` | — | 500 |
| GET | `/v1/admin/listings/applications/:id` | yes | — | — | 400, 404, 500 |
| PATCH | `/v1/admin/listings/applications/:id` | yes | — | `{ decision: "approve" \| "reject", note? }` | 400, 404, 409, 500 |
| GET | `/v1/admin/listings/tokens` | yes | `chainId?`, `limit?` (1–500, default 100), `cursor?` | — | 500 |
| GET | `/v1/admin/dex-pairs/activations` | yes | — | — | 500 |
| POST | `/v1/admin/dex-pairs/activations` | yes | — | `{ symbol, active?, note? }` (`symbol` like `LDX/USDT`) | 400, 500 |
| DELETE | `/v1/admin/dex-pairs/activations` | yes | `symbol` (required) | — | 400, 500 |
| GET | `/v1/admin/launchpad/sales` | yes | — | — | 500 |
| POST | `/v1/admin/launchpad/sales` | yes | — | sale create fields: `slug`, `title`, `offerAsset`, `payAsset` (must match CEX quote), `pricePayPerToken`, `totalOfferTokens`, `minTierRank?`, `status?` (one of: draft, live, paused, ended), `summary?`, `startsAt?`, `endsAt?` | 400, 403 (feature off), 409 (slug conflict), 500 |
| PATCH | `/v1/admin/launchpad/sales/:id` | yes | — | partial: `title`, `summary`, `status`, `startsAt`, `endsAt`, `minTierRank`, `pricePayPerToken` | 400, 403, 404, 500 |
| GET | `/v1/admin/liq-mining/campaigns` | yes | — | — | 500 |
| POST | `/v1/admin/liq-mining/campaigns` | yes | — | `multiplierBps` (required), `poolSymbol?`, `label?`, `status?` (active or paused), `startsAt?`, `endsAt?` | 400, 403, 500 |
| PATCH | `/v1/admin/liq-mining/campaigns/:id` | yes | — | partial fields as above | 400, 403, 404, 500 |
| GET | `/v1/admin/governance/signals` | yes | — | — | 500 |
| POST | `/v1/admin/governance/signals` | yes | — | `slug`, `title`, `powerBasis` (`cex_ldx_available` or `cex_ldx_staked`), `description?`, `status?` (draft, active, or closed), `startsAt?`, `endsAt?` | 400, 403, 409, 500 |
| PATCH | `/v1/admin/governance/signals/:id` | yes | — | partial: `title`, `description`, `status`, `powerBasis`, `startsAt`, `endsAt` | 400, 403, 404, 500 |

Mutation responses use service-specific JSON; failed validation usually returns `{ ok: false, error, code? }` with the status in the table.

---

## Phase G — Listing review

### `PATCH /v1/admin/listings/applications/:id`

JSON body:

- **`decision`:** `"approve"` or `"reject"`.
- **`note`:** optional string (stored on the application / reject reason).

**Approve** (only when application **`status`** is **`submitted`**): upserts **`listed_tokens`** (active) from the application fields, sets application to **`manually_listed`**, sets **`reviewedAt`**.

**Reject:** refuses if already **`auto_listed`** / **`manually_listed`**. Otherwise sets **`manually_rejected`** and **`reviewedAt`**. Idempotent rejects on already-rejected rows return **409**.

Role **`listings`** may call this endpoint (see [`admin-authz.md`](./admin-authz.md)). Optional **`X-Support-Ticket-Id`** and **`X-Admin-Approver-Key`** are recorded on the mutation audit row when present.

### `POST /v1/admin/cex/ledger/manual-adjust` (**Phase G — custodial**)

**`ADMIN_MANUAL_LEDGER_ENABLED`** must be **`true`**. Only the **`super`** role can call this path.

**Required**

- Header **`Authorization`** / **`X-Admin-Key`**: primary admin key (**`super`**).
- Header **`X-Admin-Approver-Key`**: a **second** configured admin key (must differ from primary).
- Header **`X-Support-Ticket-Id`**: must equal JSON **`ticketId`** exactly.

**JSON body**

| Field | Meaning |
|-------|---------|
| `userId` | CEX user id |
| `asset` | `CEX_MATCHER_SYMBOL` base or quote (e.g. `LDX`, `USDT`) |
| `deltaAvail` | Decimal string added to **available** (negative debits); must not drive balance below zero |
| `ticketId` | Same value as `X-Support-Ticket-Id` |
| `reason` | Optional ops note (stored in ledger `refTxHash` tail, truncated) |

Creates **`cex_ledger_entries`** row with **`kind`:** `admin_manual_adjust` and updates **`cex_balances.available`**.

| Code | HTTP |
|------|------|
| `DISABLED` | 403 |
| `DUAL_CONTROL_REQUIRED` | 403 |
| `NOT_FOUND` | 404 |
| `INSUFFICIENT_FUNDS` | 409 |

There is **no** internal-admin UI screen for this — use curl/scripts under SOP.

### `GET /v1/admin/audit-logs`

Read-only list of **`admin_api_audit_logs`** (POST/PATCH/DELETE mutations under `/v1/admin`). Use a **`super`** key, or a dedicated **`audit_read`** key ([`admin-authz.md`](./admin-authz.md)). **`listings`** and **`treasury_read`** still receive **403** on this path.

Query: **`resource`** (exact match, e.g. `launchpad/sales`), **`method`** (e.g. `POST`), pagination like other admin lists.

---

## `GET /v1/admin/system/status`

Unauthenticated. No secrets in the response.

**Response fields**

| Field | Type | Meaning |
|-------|------|---------|
| `ok` | boolean | `true` if the database ping succeeded |
| `adminEnabled` | boolean | `ADMIN_API_KEY` is set and non-empty |
| `database` | string | `ok`, `error`, or `unknown` (if Prisma client not injected) |
| `prismaMigrateHint` | string | Reminder for operators after schema changes |
| `nodeEnv` | string? | `NODE_ENV` if set |
| `gitRevision` | string? | From `GIT_REVISION`, `VERCEL_GIT_COMMIT_SHA`, or `RAILWAY_GIT_COMMIT_SHA` if set |

Example:

```json
{
  "ok": true,
  "adminEnabled": true,
  "database": "ok",
  "prismaMigrateHint": "After schema changes, run `npx prisma migrate deploy` from `lidex/backend` (see Prisma deploy docs).",
  "nodeEnv": "production",
  "gitRevision": "abc1234"
}
```

---

## Phase D — Read-only ops

### `GET /v1/admin/users/by-address/:address`

Resolves a wallet `address` (hex, any casing) to internal `userId`. **Register `by-address` before `users/:id` in the router** so the path is not treated as an id.

Success: `{ ok: true, userId, address }`. Not found: **404** `{ ok: false, code: "NOT_FOUND", error }`.

### `GET /v1/admin/users/:id`

Returns `user` (same shape as session user summary: `id`, `address`, `createdAt`, `referralParent`, `preferences`), **CEX balances** (`asset`, `available`, `locked`, `updatedAt`), and **ledger** entries (cursor on `ledger.entries[].id`):

- `ledger.entries`: `id`, `kind`, `asset`, `deltaAvail`, `refTxHash`, `createdAt`
- `ledger.nextCursor`: pass as `?cursor=` for the next page

### `GET /v1/admin/cex/overview`

Matcher symbol, `openOrdersCount` (status in `open`, `partial`, `pending_stop`), `usersCount`, `liquidityPoolsCount` (or `null` if unavailable), plus `limits` and `features` from [`cex.config` `publicConfig()`](../backend/modules/cex/cex.config.js).

---

## Quick checks

```bash
# Status (no key)
curl -sS http://localhost:4000/v1/admin/system/status | jq

# Authenticated example
curl -sS -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:4000/v1/admin/listings/applications | jq

curl -sS -H "Authorization: Bearer $ADMIN_API_KEY" \
  http://localhost:4000/v1/admin/cex/overview | jq
```

---

## Related

- Authorization matrix + rotation: [`docs/admin-authz.md`](./admin-authz.md)
- Package overview: [`admin/README.md`](../admin/README.md)
- Roadmap: [`docs/admin-plan.md`](./admin-plan.md)
- Optional Next.js operator UI (server-side key only): [`frontend/app/internal-admin/README.md`](../frontend/app/internal-admin/README.md)
