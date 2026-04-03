-- Phase 7 — token listing ecosystem (public applications + approved token registry)

CREATE TABLE IF NOT EXISTS "token_listing_applications" (
  "id" TEXT PRIMARY KEY,
  "project_name" TEXT NOT NULL,
  "contact_email" TEXT,
  "website_url" TEXT,
  "chain_id" INTEGER NOT NULL,
  "token_address" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "decimals" INTEGER NOT NULL,
  "pair_with_ldx" BOOLEAN NOT NULL DEFAULT TRUE,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "token_listing_applications_chain_addr_idx"
  ON "token_listing_applications"("chain_id", "token_address");
CREATE INDEX IF NOT EXISTS "token_listing_applications_status_created_idx"
  ON "token_listing_applications"("status", "created_at");

CREATE TABLE IF NOT EXISTS "listed_tokens" (
  "id" TEXT PRIMARY KEY,
  "chain_id" INTEGER NOT NULL,
  "address" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "decimals" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "featured" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "listed_tokens_chain_address_uq"
  ON "listed_tokens"("chain_id", "address");
CREATE INDEX IF NOT EXISTS "listed_tokens_chain_status_idx"
  ON "listed_tokens"("chain_id", "status");

