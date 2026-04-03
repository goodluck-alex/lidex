-- On-chain ERC-20 deposit credits (by tx + log) and withdrawal audit rows.

ALTER TABLE "cex_ledger_entries" ADD COLUMN "ref_tx_hash" TEXT;

CREATE TABLE "cex_onchain_deposits" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cex_onchain_deposits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cex_onchain_deposits_chain_id_tx_hash_log_index_key" ON "cex_onchain_deposits"("chain_id", "tx_hash", "log_index");

CREATE INDEX "cex_onchain_deposits_user_id_idx" ON "cex_onchain_deposits"("user_id");

ALTER TABLE "cex_onchain_deposits" ADD CONSTRAINT "cex_onchain_deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cex_onchain_withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tx_hash" TEXT,
    "fail_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cex_onchain_withdrawals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cex_onchain_withdrawals_user_id_created_at_idx" ON "cex_onchain_withdrawals"("user_id", "created_at");

ALTER TABLE "cex_onchain_withdrawals" ADD CONSTRAINT "cex_onchain_withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
