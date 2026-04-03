-- Phase 7+: DB-backed pair promotion merged with DEX_ACTIVE_PAIR_SYMBOLS at runtime.
CREATE TABLE IF NOT EXISTS "dex_pair_activations" (
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "dex_pair_activations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "dex_pair_activations_symbol_key" ON "dex_pair_activations"("symbol");
