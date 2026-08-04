CREATE TABLE IF NOT EXISTS "public"."pos_session_open_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "idempotency_key" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "pos_session_open_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pos_session_open_request_idempotency_key_key"
  ON "public"."pos_session_open_request" ("idempotency_key");

CREATE INDEX IF NOT EXISTS "pos_session_open_request_company_id_terminal_id_idx"
  ON "public"."pos_session_open_request" ("company_id", "terminal_id");
