-- Phase 2 POS reliability: reporting and recovery lookup indexes.

CREATE INDEX IF NOT EXISTS "audit_log_company_id_created_at_idx"
  ON "public"."audit_log" ("company_id", "created_at");

CREATE INDEX IF NOT EXISTS "audit_log_pos_terminal_id_created_at_idx"
  ON "public"."audit_log" ("pos_terminal_id", "created_at");

CREATE INDEX IF NOT EXISTS "audit_log_action_type_created_at_idx"
  ON "public"."audit_log" ("action_type", "created_at");

CREATE INDEX IF NOT EXISTS "timestamp_pos_terminal_id_timestamp_in_idx"
  ON "public"."timestamp" ("pos_terminal_id", "timestamp_in");

CREATE INDEX IF NOT EXISTS "timestamp_cashier_id_timestamp_in_idx"
  ON "public"."timestamp" ("cashier_id", "timestamp_in");

CREATE INDEX IF NOT EXISTS "timestamp_timestamp_out_idx"
  ON "public"."timestamp" ("timestamp_out");

CREATE INDEX IF NOT EXISTS "inventory_uuid_product_created_at_idx"
  ON "public"."inventory" ("uuid_product", "created_at");

CREATE INDEX IF NOT EXISTS "invoice_uuid_pos_terminal_status_created_at_idx"
  ON "public"."invoice" ("uuid_pos_terminal", "status", "created_at");

CREATE INDEX IF NOT EXISTS "invoice_cashier_id_created_at_idx"
  ON "public"."invoice" ("cashier_id", "created_at");

CREATE INDEX IF NOT EXISTS "invoice_created_at_idx"
  ON "public"."invoice" ("created_at");

CREATE INDEX IF NOT EXISTS "invoice_local_invoice_no_idx"
  ON "public"."invoice" ("local_invoice_no");

CREATE INDEX IF NOT EXISTS "item_uuid_product_created_at_idx"
  ON "public"."item" ("uuid_product", "created_at");

CREATE INDEX IF NOT EXISTS "item_uuid_invoice_status_idx"
  ON "public"."item" ("uuid_invoice", "status");

CREATE INDEX IF NOT EXISTS "e_payment_uuid_sale_type_created_at_idx"
  ON "public"."e_payment" ("uuid_sale_type", "created_at");

CREATE INDEX IF NOT EXISTS "offline_sync_issue_company_id_created_at_idx"
  ON "public"."offline_sync_issue" ("company_id", "created_at");

CREATE INDEX IF NOT EXISTS "offline_sync_issue_idempotency_key_idx"
  ON "public"."offline_sync_issue" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "stock_movement_company_id_movement_type_created_at_idx"
  ON "public"."stock_movement" ("company_id", "movement_type", "created_at");
