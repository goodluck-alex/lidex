-- Lidex Ambassador Program Phase 2

CREATE TABLE "ambassador_applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "telegram" TEXT NOT NULL,
    "twitter" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "promo_experience" TEXT NOT NULL,
    "promote_plan" TEXT NOT NULL,
    "youtube" TEXT,
    "discord" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassador_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ambassador_applications_user_id_key" ON "ambassador_applications"("user_id");

CREATE INDEX "ambassador_applications_status_created_at_idx" ON "ambassador_applications"("status", "created_at");

ALTER TABLE "ambassador_applications" ADD CONSTRAINT "ambassador_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ambassador_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "public_username" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "signups" INTEGER NOT NULL DEFAULT 0,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "traders" INTEGER NOT NULL DEFAULT 0,
    "deposits" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "ldx_rewarded" TEXT NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambassador_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ambassador_profiles_user_id_key" ON "ambassador_profiles"("user_id");

CREATE UNIQUE INDEX "ambassador_profiles_public_username_key" ON "ambassador_profiles"("public_username");

CREATE INDEX "ambassador_profiles_status_total_points_idx" ON "ambassador_profiles"("status", "total_points");

ALTER TABLE "ambassador_profiles" ADD CONSTRAINT "ambassador_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ambassador_point_events" (
    "id" TEXT NOT NULL,
    "ambassador_user_id" TEXT NOT NULL,
    "child_user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "month_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambassador_point_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ambassador_point_events_ambassador_user_id_child_user_id_kind_key" ON "ambassador_point_events"("ambassador_user_id", "child_user_id", "kind");

CREATE INDEX "ambassador_point_events_month_key_ambassador_user_id_idx" ON "ambassador_point_events"("month_key", "ambassador_user_id");

ALTER TABLE "ambassador_point_events" ADD CONSTRAINT "ambassador_point_events_ambassador_user_id_fkey" FOREIGN KEY ("ambassador_user_id") REFERENCES "ambassador_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ambassador_rewards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount_ldx" TEXT NOT NULL,
    "month_key" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ambassador_rewards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ambassador_rewards_user_id_created_at_idx" ON "ambassador_rewards"("user_id", "created_at");

ALTER TABLE "ambassador_rewards" ADD CONSTRAINT "ambassador_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "ambassador_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
