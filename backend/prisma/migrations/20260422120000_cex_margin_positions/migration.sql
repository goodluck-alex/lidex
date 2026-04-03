-- P8-M5 — isolated margin (quote collateral, synthetic base exposure)

CREATE TABLE "cex_margin_positions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "leverage" INTEGER NOT NULL,
    "collateral_quote" TEXT NOT NULL,
    "size_base" TEXT NOT NULL,
    "entry_price" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "last_mark_price" TEXT,
    "realized_pnl_quote" TEXT,
    "closed_at" TIMESTAMP(3),
    "close_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cex_margin_positions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cex_margin_positions_user_id_status_idx" ON "cex_margin_positions"("user_id", "status");
CREATE INDEX "cex_margin_positions_symbol_status_idx" ON "cex_margin_positions"("symbol", "status");

ALTER TABLE "cex_margin_positions" ADD CONSTRAINT "cex_margin_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
