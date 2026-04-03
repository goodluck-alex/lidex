-- Phase 8 — CEX governance signaling (weighted polls; no on-chain execution)

CREATE TABLE "gov_signal_proposals" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "power_basis" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gov_signal_proposals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gov_signal_proposals_slug_key" ON "gov_signal_proposals"("slug");
CREATE INDEX "gov_signal_proposals_status_starts_at_idx" ON "gov_signal_proposals"("status", "starts_at");

CREATE TABLE "gov_signal_votes" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gov_signal_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gov_signal_votes_proposal_id_user_id_key" ON "gov_signal_votes"("proposal_id", "user_id");
CREATE INDEX "gov_signal_votes_proposal_id_idx" ON "gov_signal_votes"("proposal_id");
CREATE INDEX "gov_signal_votes_user_id_idx" ON "gov_signal_votes"("user_id");

ALTER TABLE "gov_signal_votes" ADD CONSTRAINT "gov_signal_votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "gov_signal_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gov_signal_votes" ADD CONSTRAINT "gov_signal_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
