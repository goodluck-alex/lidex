-- Phase 5 — CEX-side LDX staking (internal balances, not on-chain)

CREATE TABLE IF NOT EXISTS "cex_stake_pools" (
  "id" TEXT PRIMARY KEY,
  "asset" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "cex_stake_positions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "pool_id" TEXT NOT NULL,
  "staked_amount" TEXT NOT NULL DEFAULT '0',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cex_stake_positions_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "cex_stake_positions_pool_fk" FOREIGN KEY ("pool_id") REFERENCES "cex_stake_pools"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "cex_stake_positions_user_pool_idx" ON "cex_stake_positions"("user_id", "pool_id");
CREATE INDEX IF NOT EXISTS "cex_stake_positions_user_idx" ON "cex_stake_positions"("user_id");
CREATE INDEX IF NOT EXISTS "cex_stake_positions_pool_idx" ON "cex_stake_positions"("pool_id");

CREATE TABLE IF NOT EXISTS "cex_stake_tiers" (
  "id" TEXT PRIMARY KEY,
  "pool_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "min_stake" TEXT NOT NULL,
  "fee_bps" INTEGER NOT NULL,
  "referral_boost_bps" INTEGER NOT NULL,
  "is_premium" BOOLEAN NOT NULL DEFAULT FALSE,
  "rank" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cex_stake_tiers_pool_fk" FOREIGN KEY ("pool_id") REFERENCES "cex_stake_pools"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "cex_stake_tiers_pool_idx" ON "cex_stake_tiers"("pool_id");

