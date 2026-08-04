CREATE TABLE IF NOT EXISTS "public"."stock_adjustment_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "idempotency_key" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_adjustment_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_adjustment_request_idempotency_key_key"
  ON "public"."stock_adjustment_request" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "stock_adjustment_request_company_id_created_at_idx"
  ON "public"."stock_adjustment_request" ("company_id", "created_at");
