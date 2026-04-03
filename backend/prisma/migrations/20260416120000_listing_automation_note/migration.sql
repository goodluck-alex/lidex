-- Phase 7: optional note when automated LDX listing runs (reject reason or skip reason).
ALTER TABLE "token_listing_applications" ADD COLUMN "automation_note" TEXT;
