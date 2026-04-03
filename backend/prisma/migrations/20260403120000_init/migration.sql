-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "referral_parent_address" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_attachments" (
    "id" TEXT NOT NULL,
    "parent_address" TEXT NOT NULL,
    "child_address" TEXT NOT NULL,
    "attached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_ledger_entries" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "parent_address" TEXT NOT NULL,
    "child_address" TEXT NOT NULL,
    "fee_token" TEXT NOT NULL,
    "integrator_fee_amount" TEXT NOT NULL,
    "reward_amount" TEXT NOT NULL,
    "amount_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "payout_status" TEXT NOT NULL DEFAULT 'unpaid',
    "tx_hash" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "payout_tx_hash" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

-- CreateIndex
CREATE INDEX "referral_attachments_parent_address_idx" ON "referral_attachments"("parent_address");

-- CreateIndex
CREATE UNIQUE INDEX "referral_attachments_parent_address_child_address_key" ON "referral_attachments"("parent_address", "child_address");

-- CreateIndex
CREATE INDEX "referral_ledger_entries_parent_address_idx" ON "referral_ledger_entries"("parent_address");

-- CreateIndex
CREATE INDEX "referral_ledger_entries_child_address_idx" ON "referral_ledger_entries"("child_address");

-- CreateIndex
CREATE INDEX "auth_sessions_user_address_idx" ON "auth_sessions"("user_address");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
