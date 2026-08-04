ALTER TABLE "public"."prescription_verification"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "prescription_verification_idempotency_key_key"
  ON "public"."prescription_verification" ("idempotency_key");
