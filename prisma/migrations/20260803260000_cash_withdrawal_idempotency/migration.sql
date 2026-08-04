CREATE TABLE IF NOT EXISTS "public"."cash_withdrawal_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "idempotency_key" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "timestamp_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "cash_withdrawal_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cash_withdrawal_request_idempotency_key_key"
  ON "public"."cash_withdrawal_request" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "cash_withdrawal_request_company_id_timestamp_id_idx"
  ON "public"."cash_withdrawal_request" ("company_id", "timestamp_id");
