# Tests

Phase 1 adds a small **Node test** suite at the repo root (no extra devDependencies).

```bash
cd lidex
npm test
```

- `tests/backend/referral.graph.test.cjs` — `levelFromDirectCount` helper (pure logic).

**Not covered yet:** frontend E2E, API integration tests against Postgres, contracts (add Jest/Vitest/Hardhat tests per workspace when ready).

**Persistence:** the backend uses **Postgres + Prisma**; add DB-backed integration tests when you want coverage for referral graph and ledger flows.
