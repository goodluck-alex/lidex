-- Phase G: optional support ticket + approver key fingerprint on admin mutation audit rows.
ALTER TABLE "admin_api_audit_logs" ADD COLUMN "support_ticket_id" VARCHAR(128);
ALTER TABLE "admin_api_audit_logs" ADD COLUMN "approver_key_fingerprint" VARCHAR(8);
