-- Phase C: POST/PATCH/DELETE under /v1/admin (no body stored). Table name avoids clash with legacy admin_audit_logs.
CREATE TABLE "admin_api_audit_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "key_fingerprint" VARCHAR(8),
    "resource" TEXT,
    "ip" TEXT,

    CONSTRAINT "admin_api_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_api_audit_logs_created_at_idx" ON "admin_api_audit_logs"("created_at");

CREATE INDEX "admin_api_audit_logs_resource_created_at_idx" ON "admin_api_audit_logs"("resource", "created_at");
