-- P8-M4: persist post-only flag, optional client order id for bots, list/cancel-all APIs

ALTER TABLE "cex_orders" ADD COLUMN "post_only" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "cex_orders" ADD COLUMN "client_order_id" TEXT;

CREATE UNIQUE INDEX "cex_orders_user_id_client_order_id_key" ON "cex_orders"("user_id", "client_order_id");
