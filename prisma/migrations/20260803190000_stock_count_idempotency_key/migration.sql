ALTER TABLE "public"."stock_count_session"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "stock_count_session_idempotency_key_key"
  ON "public"."stock_count_session" ("idempotency_key");
