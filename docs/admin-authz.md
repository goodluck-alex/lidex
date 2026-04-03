# Admin API authorization (Phases F + G)

Backend: [`admin/authz.js`](../admin/authz.js) + [`admin/middleware.js`](../admin/middleware.js).

## Keys

| Mode | Environment | Behaviour |
|------|-------------|-----------|
| **Legacy** | `ADMIN_API_KEY` only (no `ADMIN_API_KEYS_JSON`) | One key with role **`super`** (full access). |
| **Scoped** | `ADMIN_API_KEYS_JSON` | JSON array of `{ "key": "secret", "roles": ["super" \| "listings" \| "treasury_read" \| "audit_read"] }`. If set, **`ADMIN_API_KEY` is ignored** for API auth — define at least one `super` key in JSON for full ops. |

Keys must be unique. Use long random secrets (32+ bytes).

## Roles and route matrix

| Role | GET | POST / PATCH / DELETE |
|------|-----|------------------------|
| **`super`** | All `/v1/admin/*` routes (except unauthenticated status). | All mutating admin routes. |
| **`listings`** | Paths under `/v1/admin/listings`. | **`PATCH /v1/admin/listings/applications/:id`** only (approve/reject). Other mutations **403**. |
| **`treasury_read`** | `/v1/admin/users/*`, `/v1/admin/cex/overview`. | **None** (403). |
| **`audit_read`** | **`GET /v1/admin/audit-logs`** only (mutation audit tail). | **None** (403). |

**Phase F exit:** a leaked **`listings`**, **`treasury_read`**, or **`audit_read`** key cannot call `POST /v1/admin/launchpad/sales` or other mutations outside the listing patch (except **`listings`** PATCH approve/reject).

**Phase G manual ledger:** `POST /v1/admin/cex/ledger/manual-adjust` requires **`super`**, env **`ADMIN_MANUAL_LEDGER_ENABLED=true`**, **`X-Admin-Approver-Key`**, and matching **`ticketId`** / **`X-Support-Ticket-Id`** (see [`admin-api.md`](./admin-api.md)).

**Phase G (general):** optional **dual-control hints** on any mutating admin call:
- **`X-Admin-Approver-Key`** — second configured admin key (must differ from primary). When valid, its fingerprint is stored on `admin_api_audit_logs.approver_key_fingerprint`.
- **`X-Support-Ticket-Id`** — short ticket id (≤128 chars) stored on `admin_api_audit_logs.support_ticket_id`.

`GET /v1/admin/system/status` stays **unauthenticated** (ops health).

### Combining roles

One key may list multiple roles; permission is the **union** (e.g. `["listings","treasury_read"]`).

## IP allowlist (optional)

If **`ADMIN_IP_ALLOWLIST`** is non-empty (comma-separated rules), each admin request (including authenticated routes) must come from a matching IP:

- **Exact IPv4:** `203.0.113.10`
- **CIDR:** `10.0.0.0/8`, `192.168.1.0/24`

Set **`TRUST_PROXY=1`** when behind a reverse proxy so `req.ip` is the client (see [`backend/.env.example`](../backend/.env.example)).

| Code | HTTP | Meaning |
|------|------|---------|
| `ADMIN_IP_FORBIDDEN` | **403** | IP not in allowlist |
| `ADMIN_FORBIDDEN` | **403** | Key valid but role cannot access method/path |
| `UNAUTHORIZED_APPROVER` | **401** | `X-Admin-Approver-Key` did not match any configured key |
| `ADMIN_CONFIG_ERROR` | **503** | Invalid `ADMIN_API_KEYS_JSON` |
| `ADMIN_DISABLED` | **503** | No keys configured |

## Audit log (fingerprints + Phase G hints)

- **`keyFingerprint`** — first 8 hex chars of SHA-256 of the **primary** key that was accepted (after authz). Failed auth may leave null.
- **`approverKeyFingerprint`** — same for **`X-Admin-Approver-Key`** when it matched a **second** configured key (must differ from primary).
- **`supportTicketId`** — from **`X-Support-Ticket-Id`** (truncated to 128 chars), optional.

## Key rotation runbook (F3)

1. **Generate** a new secret (e.g. `openssl rand -base64 32`).
2. **Add** the new key to `ADMIN_API_KEYS_JSON` (or replace the single legacy `ADMIN_API_KEY` if not using JSON). Deploy with **both** old and new keys present so callers can switch without downtime.
3. **Update** clients (curl, Retool, internal Next admin server env): use the new key.
4. **Remove** the old key from JSON / env and **redeploy**.
5. **Verify** old credentials return **401** on a mutating admin route.
6. **Optional:** search `admin_api_audit_logs` for rows with the old key’s fingerprint to confirm no further use.

For **role-only keys**, rotate the same way; ensure at least one **`super`** key always exists before removing the previous super key.

## Related

- HTTP surface: [`admin-api.md`](./admin-api.md)
- Roadmap: [`admin-plan.md`](./admin-plan.md)
