-- Auditable paper deposit / withdraw / dev_credit (Phase 3 P3-M4 MVP)

CREATE TABLE "cex_ledger_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "delta_available" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cex_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cex_ledger_entries_user_id_created_at_idx" ON "cex_ledger_entries"("user_id", "created_at");

ALTER TABLE "cex_ledger_entries" ADD CONSTRAINT "cex_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
