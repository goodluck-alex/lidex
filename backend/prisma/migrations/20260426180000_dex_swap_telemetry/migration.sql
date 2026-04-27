-- Phase 2: DEX telemetry table for swap quote/execute outcomes
CREATE TABLE IF NOT EXISTS "dex_swap_events" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT '0x',
  "chain_id" INTEGER NOT NULL,
  "sell_token" TEXT NOT NULL,
  "buy_token" TEXT NOT NULL,
  "sell_amount" TEXT NOT NULL,
  "buy_amount" TEXT,
  "ok" BOOLEAN NOT NULL DEFAULT true,
  "code" TEXT,
  "message" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dex_swap_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "dex_swap_events_kind_created_at_idx" ON "dex_swap_events"("kind", "created_at");
CREATE INDEX IF NOT EXISTS "dex_swap_events_chain_created_at_idx" ON "dex_swap_events"("chain_id", "created_at");

