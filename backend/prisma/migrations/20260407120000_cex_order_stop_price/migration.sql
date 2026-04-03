-- Stop-limit: trigger price stored until last trade crosses stop; then order becomes a normal limit.
ALTER TABLE "cex_orders" ADD COLUMN "stop_price" TEXT;
