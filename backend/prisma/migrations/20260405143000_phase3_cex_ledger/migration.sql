-- Phase 3 (P3-M1): internal CEX ledger + orders + trades (no 0x). Greenfield installs only;
-- if your database was created outside this migrations folder, apply equivalent DDL or reconcile history.

CREATE TABLE "cex_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "available" TEXT NOT NULL DEFAULT '0',
    "locked" TEXT NOT NULL DEFAULT '0',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cex_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cex_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "order_type" TEXT NOT NULL DEFAULT 'limit',
    "price" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "filled" TEXT NOT NULL DEFAULT '0',
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cex_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cex_trades" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "maker_order_id" TEXT NOT NULL,
    "taker_order_id" TEXT NOT NULL,
    "maker_user_id" TEXT NOT NULL,
    "taker_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cex_trades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cex_balances_user_id_asset_key" ON "cex_balances"("user_id", "asset");

CREATE INDEX "cex_balances_user_id_idx" ON "cex_balances"("user_id");

CREATE INDEX "cex_orders_user_id_status_idx" ON "cex_orders"("user_id", "status");

CREATE INDEX "cex_orders_symbol_status_idx" ON "cex_orders"("symbol", "status");

CREATE INDEX "cex_trades_symbol_idx" ON "cex_trades"("symbol");

CREATE INDEX "cex_trades_created_at_idx" ON "cex_trades"("created_at");

ALTER TABLE "cex_balances" ADD CONSTRAINT "cex_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cex_orders" ADD CONSTRAINT "cex_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cex_trades" ADD CONSTRAINT "cex_trades_maker_order_id_fkey" FOREIGN KEY ("maker_order_id") REFERENCES "cex_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cex_trades" ADD CONSTRAINT "cex_trades_taker_order_id_fkey" FOREIGN KEY ("taker_order_id") REFERENCES "cex_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
