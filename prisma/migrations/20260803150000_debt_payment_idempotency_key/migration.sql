ALTER TABLE "public"."customer_debt_payment"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "customer_debt_payment_idempotency_key_key"
  ON "public"."customer_debt_payment" ("idempotency_key");
