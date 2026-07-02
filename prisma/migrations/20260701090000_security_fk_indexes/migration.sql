-- Add direct indexes for relation columns flagged by the security/performance audit.
CREATE INDEX IF NOT EXISTS "role_permission_permission_key_idx"
  ON "public"."role_permission" ("permission_key");

CREATE INDEX IF NOT EXISTS "user_permission_override_permission_key_idx"
  ON "public"."user_permission_override" ("permission_key");

CREATE INDEX IF NOT EXISTS "pos_terminal_info_branch_id_idx"
  ON "public"."pos_terminal_info" ("branch_id");

CREATE INDEX IF NOT EXISTS "receiving_record_purchase_order_id_idx"
  ON "public"."receiving_record" ("purchase_order_id");

CREATE INDEX IF NOT EXISTS "loyalty_transaction_invoice_id_idx"
  ON "public"."loyalty_transaction" ("invoice_id");

CREATE INDEX IF NOT EXISTS "promotion_redemption_log_product_id_idx"
  ON "public"."promotion_redemption_log" ("product_id");

CREATE INDEX IF NOT EXISTS "kitchen_ticket_item_id_idx"
  ON "public"."kitchen_ticket" ("item_id");
