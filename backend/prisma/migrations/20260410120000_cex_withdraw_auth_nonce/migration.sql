-- One-time nonces for signed withdraw-to-custom-address.

CREATE TABLE "cex_withdraw_auth_nonces" (
    "nonce" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cex_withdraw_auth_nonces_pkey" PRIMARY KEY ("nonce")
);

CREATE INDEX "cex_withdraw_auth_nonces_user_id_expires_at_idx" ON "cex_withdraw_auth_nonces"("user_id", "expires_at");

ALTER TABLE "cex_withdraw_auth_nonces" ADD CONSTRAINT "cex_withdraw_auth_nonces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
