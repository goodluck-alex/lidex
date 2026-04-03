-- Proxy maker order ids for internal AMM trades (CexTrade FK; orders have order_type = internal_pool, excluded from book hydrate).

ALTER TABLE "cex_liquidity_pools" ADD COLUMN "proxy_maker_buy_order_id" TEXT;
ALTER TABLE "cex_liquidity_pools" ADD COLUMN "proxy_maker_sell_order_id" TEXT;
