ALTER TABLE "public"."sales_order"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_idempotency_key_key"
  ON "public"."sales_order" ("idempotency_key");
