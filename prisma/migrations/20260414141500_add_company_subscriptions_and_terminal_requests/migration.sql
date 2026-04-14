CREATE TYPE "public"."terminal_request_status" AS ENUM (
  'pending',
  'approved',
  'fulfilled',
  'rejected',
  'cancelled'
);

CREATE TYPE "public"."subscription_billing_cycle" AS ENUM (
  'monthly',
  'quarterly',
  'annually'
);

CREATE TYPE "public"."subscription_status" AS ENUM (
  'pending',
  'active',
  'expired',
  'suspended',
  'cancelled'
);

CREATE TABLE "public"."terminal_subscription" (
  "uuid_terminal_subscription" UUID NOT NULL DEFAULT gen_random_uuid(),
  "terminal_id" UUID NOT NULL,
  "billing_cycle" "public"."subscription_billing_cycle" NOT NULL,
  "status" "public"."subscription_status" NOT NULL DEFAULT 'pending',
  "starts_at" DATE,
  "expires_at" DATE,
  "renewed_at" DATE,
  "auto_renew" BOOLEAN NOT NULL DEFAULT false,
  "price" DECIMAL(12, 2),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "terminal_subscription_pkey" PRIMARY KEY ("uuid_terminal_subscription")
);

CREATE TABLE "public"."terminal_request" (
  "uuid_terminal_request" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "requested_by_id" UUID NOT NULL,
  "reviewed_by_id" UUID,
  "requested_terminals" INTEGER NOT NULL DEFAULT 1,
  "status" "public"."terminal_request_status" NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "terminal_request_pkey" PRIMARY KEY ("uuid_terminal_request")
);

CREATE UNIQUE INDEX "terminal_subscription_terminal_id_key"
  ON "public"."terminal_subscription"("terminal_id");

CREATE INDEX "terminal_request_company_id_idx"
  ON "public"."terminal_request"("company_id");

CREATE INDEX "terminal_request_requested_by_id_idx"
  ON "public"."terminal_request"("requested_by_id");

CREATE INDEX "terminal_request_reviewed_by_id_idx"
  ON "public"."terminal_request"("reviewed_by_id");

ALTER TABLE "public"."terminal_subscription"
ADD CONSTRAINT "terminal_subscription_terminal_id_fkey"
FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."terminal_request"
ADD CONSTRAINT "terminal_request_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."terminal_request"
ADD CONSTRAINT "terminal_request_requested_by_id_fkey"
FOREIGN KEY ("requested_by_id") REFERENCES "public"."profiles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."terminal_request"
ADD CONSTRAINT "terminal_request_reviewed_by_id_fkey"
FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
