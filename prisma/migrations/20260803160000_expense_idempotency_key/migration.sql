ALTER TABLE "public"."expense"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "expense_idempotency_key_key"
  ON "public"."expense" ("idempotency_key");
