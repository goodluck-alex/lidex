-- P2P marketplace: ads, orders, chat, payment methods, merchant applications

CREATE TABLE "p2p_payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_value" TEXT NOT NULL,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "p2p_payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "p2p_merchant_applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "trading_experience" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "p2p_merchant_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "p2p_merchant_profiles" (
    "user_id" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "p2p_merchant_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "p2p_ads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "token_symbol" TEXT NOT NULL,
    "fiat_currency" TEXT NOT NULL,
    "price_type" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "amount_min" TEXT NOT NULL,
    "amount_max" TEXT NOT NULL,
    "payment_method_label" TEXT NOT NULL,
    "time_limit_minutes" INTEGER NOT NULL,
    "terms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "p2p_ads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "p2p_orders" (
    "id" TEXT NOT NULL,
    "ad_id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "seller_user_id" TEXT NOT NULL,
    "fiat_amount" TEXT NOT NULL,
    "token_amount" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_payment',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "p2p_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "p2p_chat_messages" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "p2p_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "p2p_payment_methods_user_id_idx" ON "p2p_payment_methods"("user_id");

CREATE INDEX "p2p_merchant_applications_user_id_idx" ON "p2p_merchant_applications"("user_id");
CREATE INDEX "p2p_merchant_applications_status_created_at_idx" ON "p2p_merchant_applications"("status", "created_at");

CREATE INDEX "p2p_ads_status_token_symbol_fiat_currency_side_idx" ON "p2p_ads"("status", "token_symbol", "fiat_currency", "side");
CREATE INDEX "p2p_ads_user_id_idx" ON "p2p_ads"("user_id");

CREATE INDEX "p2p_orders_buyer_user_id_status_idx" ON "p2p_orders"("buyer_user_id", "status");
CREATE INDEX "p2p_orders_seller_user_id_status_idx" ON "p2p_orders"("seller_user_id", "status");
CREATE INDEX "p2p_orders_ad_id_idx" ON "p2p_orders"("ad_id");
CREATE INDEX "p2p_orders_expires_at_idx" ON "p2p_orders"("expires_at");

CREATE INDEX "p2p_chat_messages_order_id_created_at_idx" ON "p2p_chat_messages"("order_id", "created_at");

ALTER TABLE "p2p_payment_methods" ADD CONSTRAINT "p2p_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_merchant_applications" ADD CONSTRAINT "p2p_merchant_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_merchant_profiles" ADD CONSTRAINT "p2p_merchant_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_ads" ADD CONSTRAINT "p2p_ads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_orders" ADD CONSTRAINT "p2p_orders_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "p2p_ads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "p2p_orders" ADD CONSTRAINT "p2p_orders_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_orders" ADD CONSTRAINT "p2p_orders_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_chat_messages" ADD CONSTRAINT "p2p_chat_messages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "p2p_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p2p_chat_messages" ADD CONSTRAINT "p2p_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
