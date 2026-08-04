ALTER TABLE "public"."repair_job"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "repair_job_idempotency_key_key"
  ON "public"."repair_job" ("idempotency_key");
