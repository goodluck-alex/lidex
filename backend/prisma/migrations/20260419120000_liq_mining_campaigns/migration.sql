-- Phase 8 — LP liquidity mining (boost reward emission via time-bounded campaigns).
CREATE TABLE IF NOT EXISTS "liq_mining_campaigns" (
  "id" TEXT NOT NULL,
  "pool_symbol" TEXT,
  "label" TEXT,
  "multiplier_bps" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "starts_at" TIMESTAMPTZ,
  "ends_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "liq_mining_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "liq_mining_campaigns_pool_status_idx" ON "liq_mining_campaigns"("pool_symbol", "status");
