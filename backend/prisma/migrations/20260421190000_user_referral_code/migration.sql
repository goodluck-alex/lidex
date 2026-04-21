-- Public referral code per user (?ref=...). Values are assigned when the user row is first created or on login.

ALTER TABLE "users" ADD COLUMN "referral_code" TEXT;

CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");
