# Admin department — structured plan

**Architecture (fixed):** One [`backend/server.js`](../backend/server.js) serves **frontend** (user APIs) and **`/v1/admin/*`** (operator APIs). The [`admin/`](../admin/) folder is code the backend loads—not a separate service. See [`admin/README.md`](../admin/README.md).

This document is the **execution plan** for maturing that surface.

---

## Current baseline

| Item | Status |
|------|--------|
| `admin/middleware.js` + `admin/index.js` + `admin/routes.js` | API key gate; `registerAdminRoutes` from backend |
| `/v1/admin/*` handlers | In `admin/routes.js` |
| `GET /v1/admin/system/status` | Unauthenticated ops JSON (`docs/admin-api.md`) |
| Phase D read APIs | `users/:id`, `users/by-address/:addr`, `cex/overview` — see `admin-api.md` |
| Admin UI | Optional: `/internal-admin` in [`frontend/app/internal-admin/`](../frontend/app/internal-admin/) (Phase E) |
| Audit log | `AdminAuditLog` → `admin_api_audit_logs` (mutations only; see Phase C) |
| Auth | `ADMIN_API_KEY` / `ADMIN_API_KEYS_JSON`; optional IP allowlist — [`admin-authz.md`](./admin-authz.md) |
| Phase G manual ledger | Opt-in `POST /v1/admin/cex/ledger/manual-adjust` — [`admin-api.md`](./admin-api.md) |
| Audit log (read API) | `GET /v1/admin/audit-logs` — **`super`** or **`audit_read`** |

---

## Phase A — Route module (structure, no new features)

**Goal:** Admin routes live under `admin/`; `server.js` stays a thin mount point.

| Step | Work |
|------|------|
| A1 | Add `admin/routes.js` exporting `function registerAdminRoutes(app, deps)` where `deps` holds services (`listingsService`, `dexPairActivationService`, …) and `requireAdminApiKey`. |
| A2 | Move each `app.get/post/patch/delete("/v1/admin/...")` block from `server.js` into `registerAdminRoutes`. |
| A3 | In `server.js`: one call `registerAdminRoutes(app, deps)` after middleware setup. |
| A4 | Smoke test all existing admin endpoints (same paths, same auth). |

**Exit:** No behavior change; grep `server.js` for `/v1/admin` → ideally zero matches besides the register call.

---

## Phase B — Operator contract & health

**Goal:** One place docs + a safe “is the plane flying?” JSON for ops.

| Step | Work |
|------|------|
| B1 | Add `docs/admin-api.md` — table of every `/v1/admin/*` method, path, query/body, error codes. |
| B2 | Add `GET /v1/admin/system/status` (or `/health`): `{ ok, adminEnabled, database, prismaMigrateHint }` — **no secrets**; optional git hash / `NODE_ENV`. |
| B3 | Link `admin/README.md` → `docs/admin-api.md`. |

**Exit:** New engineer can run status + curl admin from the doc.

**Status (2026-04):** B1–B3 shipped — [`admin-api.md`](./admin-api.md), `GET /v1/admin/system/status`, README link.

---

## Phase C — Audit trail (mutations)

**Goal:** Every POST/PATCH/DELETE under `/v1/admin` leaves a durable row.

| Step | Work |
|------|------|
| C1 | Prisma model `AdminAuditLog`: `id`, `createdAt`, `method`, `path`, `statusCode`, `keyFingerprint` (first 8 hex of SHA256(key)), optional `resource`, `ip` (from `trust proxy`). Persisted to table **`admin_api_audit_logs`** (avoids collision with unrelated `admin_audit_logs` in some deployments). |
| C2 | Wrap admin mutating handlers or use Express middleware **after** response to append rows (avoid logging bodies). |
| C3 | Document retention (e.g. 90 days) in `admin-plan.md` or compliance doc. |

**Exit:** Listing a sale / patching DEX activation creates a queryable log line.

**Retention (C3):** Treat `admin_api_audit_logs` as operational/security telemetry. **Default policy: keep at least 90 days** for investigations; delete or archive older rows via scheduled job (e.g. `DELETE … WHERE created_at < now() - interval '90 days'`). Adjust to your compliance program; this repo does not ship a retention job.

**Status (2026-04):** C1–C3 shipped — `admin/auditMiddleware.js`, migration `20260423120000_admin_api_audit_log`, `TRUST_PROXY=1` in [`backend/.env.example`](../backend/.env.example).

---

## Phase D — Read-only ops toolkit

**Goal:** Support investigation without raw DB access.

| Step | Work |
|------|------|
| D1 | `GET /v1/admin/users/:id` — user row + balance summary + last N ledger entries (cursor). |
| D2 | `GET /v1/admin/users/by-address/:address` — resolve `id`. |
| D3 | `GET /v1/admin/cex/overview` — optional aggregates (open orders count, matcher symbol, feature flags snapshot read from env/config helpers). |

**Exit:** Runbook: “user says balance wrong” uses admin read APIs first.

**Status (2026-04):** D1–D3 shipped — [`adminOps.service.js`](../backend/modules/adminOps/adminOps.service.js), routes in [`admin/routes.js`](../admin/routes.js), documented in [`admin-api.md`](./admin-api.md).

---

## Phase E — Internal console (optional UI)

**Goal:** Non-engineers operate day-to-day Phase 7/8 flows.

- Small Next app in `admin-ui/` **or** protected routes under `frontend/app/internal-admin/` (server-side proxy with key in env **only on server**—never `NEXT_PUBLIC_*` for `ADMIN_API_KEY`).
- Screens: listing queue, DEX activations, launchpad, liq mining, governance — **mirror existing APIs only**.

**Exit:** No production admin key in browser bundle.

**Status (2026-04):** Implemented under [`frontend/app/internal-admin/`](../frontend/app/internal-admin/) — Server Components + Server Actions call `/v1/admin/*` via [`frontend/lib/adminServer.ts`](../frontend/lib/adminServer.ts) with `ADMIN_API_KEY` (server-only). UI gate: httpOnly cookie derived with `INTERNAL_ADMIN_UI_PASSWORD` + `ADMIN_API_KEY` (see [`frontend/lib/internalAdminSession.ts`](../frontend/lib/internalAdminSession.ts)); in **production** the UI password is required. In development, if `INTERNAL_ADMIN_UI_PASSWORD` is unset, middleware allows access without a session cookie (trusted localhost only). See [`frontend/.env.local.example`](../frontend/.env.local.example).

---

## Phase F — Strong auth (production hardening)

**Goal:** Reduce blast radius of a leaked key.

| Step | Work |
|------|------|
| F1 | Scoped keys or OIDC for staff; optional IP allowlist middleware for `/v1/admin`. |
| F2 | Role flags on routes (`listings`, `treasury_read`, `super`) — design matrix before coding. |
| F3 | Key rotation runbook in `docs/` or internal wiki. |

**Exit:** Stolen read-only key cannot patch launchpad.

**Status (2026-04):** F1–F3 shipped — [`admin/authz.js`](../admin/authz.js), optional `ADMIN_API_KEYS_JSON` + `ADMIN_IP_ALLOWLIST`, role matrix + rotation notes in [`docs/admin-authz.md`](./admin-authz.md).

---

## Phase G — Controlled writes (high risk)

**Goal:** Only after C + F + legal/process.

- Listing approve/reject API if not already complete.
- Manual balance adjustments: ticket id + dual-control fields on `AdminAuditLog`; **extremely rare**.

**Exit:** Each write requires SOP + audit row + human signer.

**Status (2026-04):** Shipped — Listing **`PATCH /v1/admin/listings/applications/:id`** ([`listings.service.js`](../backend/modules/listings/listings.service.js)). **Manual CEX available adjustment:** **`POST /v1/admin/cex/ledger/manual-adjust`** ([`adminOps.service.js`](../backend/modules/adminOps/adminOps.service.js)) behind **`ADMIN_MANUAL_LEDGER_ENABLED`**, **`super`** only, dual approver + ticket. Audit columns **`support_ticket_id`** / **`approver_key_fingerprint`**; ledger kind **`admin_manual_adjust`**. **Legal/process:** keep an external SOP; this API is technical support only.

---

## Suggested order & timeline (indicative)

| Phase | Depends on | Rough effort |
|-------|------------|--------------|
| A | — | 0.5–1 d |
| B | A (cleaner mount) | 0.5 d |
| C | A | 1–2 d |
| D | B | 1–2 d |
| E | A, B | 3–10 d (product) |
| F | C | 3–5 d |
| G | C, F, counsel | case-by-case |

Start with **A → B → C** for maximum maintainability and traceability before building UI.

---

## References

- Middleware: [`admin/middleware.js`](../admin/middleware.js)
- Phase F auth matrix + rotation: [`admin-authz.md`](./admin-authz.md)
- CEX ops / compliance: [`cex-compliance-and-ops.md`](./cex-compliance-and-ops.md)
- DEX admin API (pair activations): [`dex-env.md`](./dex-env.md)

---

*Plan version: 2026-04-03 — aligned with single-backend + `lidex/admin` package layout.*
