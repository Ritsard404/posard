-- Speed up active POS session lookups. These queries always filter open sessions
-- with timestamp_out IS NULL, so partial indexes stay small and cheap to update.
CREATE INDEX IF NOT EXISTS "timestamp_active_cashier_created_at_idx"
ON "public"."timestamp" ("cashier_id", "created_at" DESC)
WHERE "timestamp_out" IS NULL;

CREATE INDEX IF NOT EXISTS "timestamp_active_terminal_idx"
ON "public"."timestamp" ("pos_terminal_id")
WHERE "timestamp_out" IS NULL;

-- Speed up invoice number generation per terminal and mode.
CREATE INDEX IF NOT EXISTS "invoice_terminal_train_number_idx"
ON "public"."invoice" ("uuid_pos_terminal", "is_train_mode", "invoice_number" DESC);
