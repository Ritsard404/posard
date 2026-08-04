ALTER TABLE "public"."receiving_record"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "receiving_record_idempotency_key_key"
  ON "public"."receiving_record" ("idempotency_key");
