-- Phase 8 — CEX launchpad (internal settlement).
CREATE TABLE IF NOT EXISTS "launchpad_sales" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "offer_asset" TEXT NOT NULL,
  "pay_asset" TEXT NOT NULL,
  "price_pay_per_token" TEXT NOT NULL,
  "total_offer_tokens" TEXT NOT NULL,
  "sold_tokens" TEXT NOT NULL DEFAULT '0',
  "min_tier_rank" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "starts_at" TIMESTAMPTZ,
  "ends_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "launchpad_sales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "launchpad_sales_slug_key" ON "launchpad_sales"("slug");
CREATE INDEX IF NOT EXISTS "launchpad_sales_status_starts_idx" ON "launchpad_sales"("status", "starts_at");

CREATE TABLE IF NOT EXISTS "launchpad_allocations" (
  "id" TEXT NOT NULL,
  "sale_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "pay_amount" TEXT NOT NULL,
  "tokens_received" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "launchpad_allocations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "launchpad_allocations_sale_user_idx" ON "launchpad_allocations"("sale_id", "user_id");
CREATE INDEX IF NOT EXISTS "launchpad_allocations_user_created_idx" ON "launchpad_allocations"("user_id", "created_at");

ALTER TABLE "launchpad_allocations" ADD CONSTRAINT "launchpad_allocations_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "launchpad_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "launchpad_allocations" ADD CONSTRAINT "launchpad_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
