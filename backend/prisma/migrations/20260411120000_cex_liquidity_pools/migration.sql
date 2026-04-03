-- Phase 4: internal liquidity pool state (read APIs v1; add/remove liquidity later)

CREATE TABLE "cex_liquidity_pools" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "base_asset" TEXT NOT NULL,
    "quote_asset" TEXT NOT NULL,
    "reserve_base" TEXT NOT NULL DEFAULT '0',
    "reserve_quote" TEXT NOT NULL DEFAULT '0',
    "total_lp_supply" TEXT NOT NULL DEFAULT '0',
    "fee_bps" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cex_liquidity_pools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cex_liquidity_pools_symbol_key" ON "cex_liquidity_pools"("symbol");

CREATE TABLE "cex_liquidity_positions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "lp_shares" TEXT NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cex_liquidity_positions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cex_liquidity_positions_user_id_pool_id_key" ON "cex_liquidity_positions"("user_id", "pool_id");

CREATE INDEX "cex_liquidity_positions_user_id_idx" ON "cex_liquidity_positions"("user_id");

CREATE INDEX "cex_liquidity_positions_pool_id_idx" ON "cex_liquidity_positions"("pool_id");

ALTER TABLE "cex_liquidity_positions" ADD CONSTRAINT "cex_liquidity_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cex_liquidity_positions" ADD CONSTRAINT "cex_liquidity_positions_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "cex_liquidity_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
