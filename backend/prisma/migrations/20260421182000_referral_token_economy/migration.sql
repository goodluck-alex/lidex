-- This migration was generated via `prisma migrate diff` against the current database.

-- DropForeignKey
ALTER TABLE "cex_stake_positions" DROP CONSTRAINT "cex_stake_positions_pool_fk";

-- DropForeignKey
ALTER TABLE "cex_stake_positions" DROP CONSTRAINT "cex_stake_positions_user_fk";

-- DropForeignKey
ALTER TABLE "cex_stake_tiers" DROP CONSTRAINT "cex_stake_tiers_pool_fk";

-- AlterTable
ALTER TABLE "cex_liquidity_pools" ALTER COLUMN "reward_last_accrued_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cex_onchain_sync_state" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cex_onchain_withdrawals" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cex_stake_pools" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cex_stake_positions" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cex_stake_tiers" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "dex_pair_activations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "launchpad_allocations" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "launchpad_sales" ALTER COLUMN "starts_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ends_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "liq_mining_campaigns" ALTER COLUMN "starts_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ends_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "listed_tokens" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "token_listing_applications" ALTER COLUMN "reviewed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_user_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "pending_reward_ldx" TEXT NOT NULL DEFAULT '10',

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_checks" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "check_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "amount" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ldx_amount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlock_at" TIMESTAMP(3),
    "referral_id" TEXT,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balances" (
    "wallet_address" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_earned" TEXT NOT NULL DEFAULT '0',
    "locked" TEXT NOT NULL DEFAULT '0',
    "unlocked" TEXT NOT NULL DEFAULT '0',
    "claimed" TEXT NOT NULL DEFAULT '0',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balances_pkey" PRIMARY KEY ("wallet_address")
);

-- CreateTable
CREATE TABLE "unlock_rules" (
    "id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "unlock_percentage" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unlock_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_user_id_key" ON "referrals"("referred_user_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_user_id_created_at_idx" ON "referrals"("referrer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "referrals_status_created_at_idx" ON "referrals"("status", "created_at");

-- CreateIndex
CREATE INDEX "referral_checks_referral_id_idx" ON "referral_checks"("referral_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_checks_referral_id_check_type_key" ON "referral_checks"("referral_id", "check_type");

-- CreateIndex
CREATE INDEX "wallet_activity_user_id_created_at_idx" ON "wallet_activity"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_activity_wallet_address_created_at_idx" ON "wallet_activity"("wallet_address", "created_at");

-- CreateIndex
CREATE INDEX "wallet_activity_activity_type_created_at_idx" ON "wallet_activity"("activity_type", "created_at");

-- CreateIndex
CREATE INDEX "rewards_user_id_created_at_idx" ON "rewards"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "rewards_status_unlock_at_idx" ON "rewards"("status", "unlock_at");

-- CreateIndex
CREATE INDEX "rewards_referral_id_idx" ON "rewards"("referral_id");

-- CreateIndex
CREATE UNIQUE INDEX "balances_user_id_key" ON "balances"("user_id");

-- CreateIndex
CREATE INDEX "unlock_rules_rule_type_idx" ON "unlock_rules"("rule_type");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_checks" ADD CONSTRAINT "referral_checks_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_activity" ADD CONSTRAINT "wallet_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balances" ADD CONSTRAINT "balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cex_stake_positions" ADD CONSTRAINT "cex_stake_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cex_stake_positions" ADD CONSTRAINT "cex_stake_positions_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "cex_stake_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cex_stake_tiers" ADD CONSTRAINT "cex_stake_tiers_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "cex_stake_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ambassador_point_events_ambassador_user_id_child_user_id_kind_k" RENAME TO "ambassador_point_events_ambassador_user_id_child_user_id_ki_key";

-- RenameIndex
ALTER INDEX "cex_stake_positions_pool_idx" RENAME TO "cex_stake_positions_pool_id_idx";

-- RenameIndex
ALTER INDEX "cex_stake_positions_user_idx" RENAME TO "cex_stake_positions_user_id_idx";

-- RenameIndex
ALTER INDEX "cex_stake_positions_user_pool_idx" RENAME TO "cex_stake_positions_user_id_pool_id_key";

-- RenameIndex
ALTER INDEX "cex_stake_tiers_pool_idx" RENAME TO "cex_stake_tiers_pool_id_idx";

-- RenameIndex
ALTER INDEX "launchpad_allocations_sale_user_idx" RENAME TO "launchpad_allocations_sale_id_user_id_idx";

-- RenameIndex
ALTER INDEX "launchpad_allocations_user_created_idx" RENAME TO "launchpad_allocations_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "launchpad_sales_status_starts_idx" RENAME TO "launchpad_sales_status_starts_at_idx";

-- RenameIndex
ALTER INDEX "liq_mining_campaigns_pool_status_idx" RENAME TO "liq_mining_campaigns_pool_symbol_status_idx";

-- RenameIndex
ALTER INDEX "listed_tokens_chain_address_uq" RENAME TO "listed_tokens_chain_id_address_key";

-- RenameIndex
ALTER INDEX "listed_tokens_chain_status_idx" RENAME TO "listed_tokens_chain_id_status_idx";

-- RenameIndex
ALTER INDEX "token_listing_applications_chain_addr_idx" RENAME TO "token_listing_applications_chain_id_token_address_idx";

-- RenameIndex
ALTER INDEX "token_listing_applications_status_created_idx" RENAME TO "token_listing_applications_status_created_at_idx";

