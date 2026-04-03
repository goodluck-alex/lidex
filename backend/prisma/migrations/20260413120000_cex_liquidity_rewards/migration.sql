-- Phase 4 — LP rewards metadata on pools + positions

ALTER TABLE "cex_liquidity_pools"
  ADD COLUMN IF NOT EXISTS "reward_asset" TEXT,
  ADD COLUMN IF NOT EXISTS "reward_rate_per_second" TEXT,
  ADD COLUMN IF NOT EXISTS "reward_acc_per_lp" TEXT NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "reward_last_accrued_at" TIMESTAMPTZ;

ALTER TABLE "cex_liquidity_positions"
  ADD COLUMN IF NOT EXISTS "reward_debt" TEXT NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "unclaimed_reward" TEXT NOT NULL DEFAULT '0';

