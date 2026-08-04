ALTER TABLE "public"."non_sales_income"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "non_sales_income_idempotency_key_key"
  ON "public"."non_sales_income" ("idempotency_key");
