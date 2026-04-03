-- Block cursor + pending tx queue for automatic ERC-20 deposit detection.

CREATE TABLE "cex_onchain_sync_state" (
    "chain_id" INTEGER NOT NULL,
    "last_scanned_block" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cex_onchain_sync_state_pkey" PRIMARY KEY ("chain_id")
);

CREATE TABLE "cex_onchain_pending_deposits" (
    "chain_id" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cex_onchain_pending_deposits_pkey" PRIMARY KEY ("chain_id","tx_hash")
);
