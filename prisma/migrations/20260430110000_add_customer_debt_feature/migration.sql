CREATE TYPE "public"."debt_status" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED');

ALTER TABLE "public"."pos_terminal_info"
  ADD COLUMN "allow_cashier_debt_create" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allow_cashier_debt_collect" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "require_manager_approval_for_debt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "default_debt_due_days" INTEGER;

CREATE TABLE "public"."customer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."customer_debt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "customer_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "original_amount" DECIMAL(15,2) NOT NULL,
  "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "remaining_amount" DECIMAL(15,2) NOT NULL,
  "status" "public"."debt_status" NOT NULL DEFAULT 'UNPAID',
  "due_date" TIMESTAMPTZ NOT NULL,
  "paid_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_by_id" UUID NOT NULL,
  "approved_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_debt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."customer_debt_payment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "debt_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "timestamp_id" UUID,
  "amount" DECIMAL(15,2) NOT NULL,
  "method" TEXT NOT NULL,
  "reference_no" TEXT,
  "notes" TEXT,
  "received_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_debt_payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_debt_invoice_id_key" ON "public"."customer_debt"("invoice_id");

CREATE INDEX "customer_company_id_is_active_idx" ON "public"."customer"("company_id", "is_active");
CREATE INDEX "customer_company_id_name_idx" ON "public"."customer"("company_id", "name");
CREATE INDEX "customer_debt_company_id_status_idx" ON "public"."customer_debt"("company_id", "status");
CREATE INDEX "customer_debt_terminal_id_idx" ON "public"."customer_debt"("terminal_id");
CREATE INDEX "customer_debt_customer_id_idx" ON "public"."customer_debt"("customer_id");
CREATE INDEX "customer_debt_due_date_idx" ON "public"."customer_debt"("due_date");
CREATE INDEX "customer_debt_created_by_id_idx" ON "public"."customer_debt"("created_by_id");
CREATE INDEX "customer_debt_approved_by_id_idx" ON "public"."customer_debt"("approved_by_id");
CREATE INDEX "customer_debt_payment_debt_id_created_at_idx" ON "public"."customer_debt_payment"("debt_id", "created_at");
CREATE INDEX "customer_debt_payment_company_id_created_at_idx" ON "public"."customer_debt_payment"("company_id", "created_at");
CREATE INDEX "customer_debt_payment_terminal_id_idx" ON "public"."customer_debt_payment"("terminal_id");
CREATE INDEX "customer_debt_payment_timestamp_id_idx" ON "public"."customer_debt_payment"("timestamp_id");
CREATE INDEX "customer_debt_payment_received_by_id_idx" ON "public"."customer_debt_payment"("received_by_id");

ALTER TABLE "public"."customer"
  ADD CONSTRAINT "customer_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."customer_debt"
  ADD CONSTRAINT "customer_debt_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_terminal_id_fkey"
  FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."customer_debt_payment"
  ADD CONSTRAINT "customer_debt_payment_debt_id_fkey"
  FOREIGN KEY ("debt_id") REFERENCES "public"."customer_debt"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_payment_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_payment_terminal_id_fkey"
  FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_payment_timestamp_id_fkey"
  FOREIGN KEY ("timestamp_id") REFERENCES "public"."timestamp"("uuid_timestamp")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "customer_debt_payment_received_by_id_fkey"
  FOREIGN KEY ("received_by_id") REFERENCES "public"."profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
