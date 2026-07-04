CREATE TYPE "public"."business_type_preset" AS ENUM ('RETAIL', 'PHARMACY', 'RESTAURANT', 'SERVICE', 'REPAIR', 'WHOLESALE', 'APPAREL', 'HARDWARE', 'SERIALIZED_GOODS');

CREATE TYPE "public"."customer_account_type" AS ENUM ('RETAIL', 'WHOLESALE', 'B2B', 'VIP', 'STAFF');

CREATE TYPE "public"."product_tracking_mode" AS ENUM ('STANDARD', 'SERVICE', 'NON_STOCK', 'VARIANT_PARENT', 'SERIALIZED', 'BUNDLE');

CREATE TYPE "public"."service_booking_status" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TYPE "public"."repair_job_status" AS ENUM ('INTAKE', 'DIAGNOSING', 'WAITING_PARTS', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'WARRANTY_REWORK');

CREATE TYPE "public"."sales_order_status" AS ENUM ('DRAFT', 'QUOTED', 'APPROVED', 'FULFILLING', 'PARTIALLY_INVOICED', 'INVOICED', 'CANCELLED');

CREATE TYPE "public"."serial_item_status" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'RETURNED', 'WARRANTY_SERVICE', 'RETIRED');

CREATE TYPE "public"."pos_open_ticket_status" AS ENUM ('DRAFT', 'HELD', 'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SETTLING', 'COMPLETED', 'CANCELLED');

CREATE TYPE "public"."prescription_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "public"."company"
  ADD COLUMN "business_type_preset" "public"."business_type_preset" NOT NULL DEFAULT 'RETAIL';

ALTER TABLE "public"."pos_terminal_info"
  ADD COLUMN "business_type_preset_override" "public"."business_type_preset";

ALTER TABLE "public"."product"
  ADD COLUMN "tracking_mode" "public"."product_tracking_mode" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "service_duration_minutes" INTEGER,
  ADD COLUMN "warranty_days" INTEGER;

ALTER TABLE "public"."customer"
  ADD COLUMN "account_type" "public"."customer_account_type" NOT NULL DEFAULT 'RETAIL',
  ADD COLUMN "price_level" TEXT,
  ADD COLUMN "credit_limit" DECIMAL(15, 2),
  ADD COLUMN "payment_terms_days" INTEGER;

CREATE TABLE "public"."service_booking" (
  "uuid_service_booking" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "customer_id" UUID,
  "service_product_id" UUID,
  "assigned_staff_id" UUID,
  "created_by_id" UUID,
  "invoice_id" UUID,
  "scheduled_start" TIMESTAMPTZ NOT NULL,
  "scheduled_end" TIMESTAMPTZ,
  "status" "public"."service_booking_status" NOT NULL DEFAULT 'SCHEDULED',
  "deposit_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "final_amount" DECIMAL(15, 2),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "service_booking_pkey" PRIMARY KEY ("uuid_service_booking")
);

CREATE TABLE "public"."repair_job" (
  "uuid_repair_job" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "customer_id" UUID,
  "labor_product_id" UUID,
  "assigned_staff_id" UUID,
  "created_by_id" UUID,
  "invoice_id" UUID,
  "warranty_source_job_id" UUID,
  "item_label" TEXT NOT NULL,
  "serial_reference" TEXT,
  "issue_summary" TEXT NOT NULL,
  "intake_notes" TEXT,
  "estimate_amount" DECIMAL(15, 2),
  "deposit_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "status" "public"."repair_job_status" NOT NULL DEFAULT 'INTAKE',
  "due_date" DATE,
  "picked_up_at" TIMESTAMPTZ,
  "warranty_until" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "repair_job_pkey" PRIMARY KEY ("uuid_repair_job")
);

CREATE TABLE "public"."repair_job_part" (
  "uuid_repair_job_part" UUID NOT NULL DEFAULT gen_random_uuid(),
  "repair_job_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(19, 4) NOT NULL,
  "unit_price" DECIMAL(15, 2) NOT NULL,
  "used_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "repair_job_part_pkey" PRIMARY KEY ("uuid_repair_job_part")
);

CREATE TABLE "public"."sales_order" (
  "uuid_sales_order" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "customer_id" UUID,
  "created_by_id" UUID,
  "invoice_id" UUID,
  "status" "public"."sales_order_status" NOT NULL DEFAULT 'DRAFT',
  "quote_valid_until" DATE,
  "payment_terms_days" INTEGER,
  "credit_limit_snapshot" DECIMAL(15, 2),
  "subtotal_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "delivery_status" TEXT,
  "delivery_notes" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "sales_order_pkey" PRIMARY KEY ("uuid_sales_order")
);

CREATE TABLE "public"."sales_order_item" (
  "uuid_sales_order_item" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sales_order_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "description" TEXT,
  "quantity" DECIMAL(19, 4) NOT NULL,
  "unit_price" DECIMAL(15, 2) NOT NULL,
  "discount_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "line_total" DECIMAL(15, 2) NOT NULL,
  CONSTRAINT "sales_order_item_pkey" PRIMARY KEY ("uuid_sales_order_item")
);

CREATE TABLE "public"."product_variant" (
  "uuid_product_variant" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "sku" VARCHAR(100),
  "barcode" VARCHAR(100),
  "option_name" TEXT NOT NULL,
  "option_value" TEXT NOT NULL,
  "price_delta" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "cost_delta" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "quantity" DECIMAL(19, 4),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "product_variant_pkey" PRIMARY KEY ("uuid_product_variant")
);

CREATE TABLE "public"."product_unit" (
  "uuid_product_unit" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "unit_name" VARCHAR(50) NOT NULL,
  "unit_barcode" VARCHAR(100),
  "base_quantity" DECIMAL(19, 4) NOT NULL,
  "sale_price" DECIMAL(15, 2),
  "is_default_sale_unit" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "product_unit_pkey" PRIMARY KEY ("uuid_product_unit")
);

CREATE TABLE "public"."product_serial" (
  "uuid_product_serial" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "variant_id" UUID,
  "customer_id" UUID,
  "serial_number" TEXT NOT NULL,
  "imei" TEXT,
  "status" "public"."serial_item_status" NOT NULL DEFAULT 'AVAILABLE',
  "warranty_until" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "product_serial_pkey" PRIMARY KEY ("uuid_product_serial")
);

CREATE TABLE "public"."product_bundle" (
  "uuid_product_bundle" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "parent_product_id" UUID NOT NULL,
  "component_product_id" UUID NOT NULL,
  "component_quantity" DECIMAL(19, 4) NOT NULL,
  "consume_stock" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "product_bundle_pkey" PRIMARY KEY ("uuid_product_bundle")
);

CREATE TABLE "public"."pos_open_ticket" (
  "uuid_pos_open_ticket" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticket_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID NOT NULL,
  "cashier_id" UUID,
  "customer_id" UUID,
  "invoice_id" UUID,
  "status" "public"."pos_open_ticket_status" NOT NULL DEFAULT 'DRAFT',
  "fulfillment_type" "public"."fulfillment_type" NOT NULL DEFAULT 'WALK_IN',
  "table_number" TEXT,
  "guest_count" INTEGER,
  "ticket_name" TEXT,
  "kitchen_station" TEXT,
  "cart_snapshot" JSONB NOT NULL,
  "totals_snapshot" JSONB,
  "idempotency_key" TEXT,
  "sent_to_kitchen_at" TIMESTAMPTZ,
  "settled_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "pos_open_ticket_pkey" PRIMARY KEY ("uuid_pos_open_ticket")
);

CREATE TABLE "public"."prescription_verification" (
  "uuid_prescription_verification" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "customer_id" UUID,
  "product_id" UUID NOT NULL,
  "invoice_id" UUID,
  "verified_by_id" UUID,
  "prescription_reference" TEXT,
  "status" "public"."prescription_verification_status" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "verified_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "prescription_verification_pkey" PRIMARY KEY ("uuid_prescription_verification")
);

CREATE UNIQUE INDEX "service_booking_booking_number_key" ON "public"."service_booking"("booking_number");
CREATE INDEX "service_booking_company_id_status_scheduled_start_idx" ON "public"."service_booking"("company_id", "status", "scheduled_start");
CREATE INDEX "service_booking_terminal_id_idx" ON "public"."service_booking"("terminal_id");
CREATE INDEX "service_booking_customer_id_idx" ON "public"."service_booking"("customer_id");
CREATE INDEX "service_booking_service_product_id_idx" ON "public"."service_booking"("service_product_id");
CREATE INDEX "service_booking_assigned_staff_id_idx" ON "public"."service_booking"("assigned_staff_id");
CREATE INDEX "service_booking_invoice_id_idx" ON "public"."service_booking"("invoice_id");

CREATE UNIQUE INDEX "repair_job_job_number_key" ON "public"."repair_job"("job_number");
CREATE INDEX "repair_job_company_id_status_due_date_idx" ON "public"."repair_job"("company_id", "status", "due_date");
CREATE INDEX "repair_job_terminal_id_idx" ON "public"."repair_job"("terminal_id");
CREATE INDEX "repair_job_customer_id_idx" ON "public"."repair_job"("customer_id");
CREATE INDEX "repair_job_labor_product_id_idx" ON "public"."repair_job"("labor_product_id");
CREATE INDEX "repair_job_assigned_staff_id_idx" ON "public"."repair_job"("assigned_staff_id");
CREATE INDEX "repair_job_invoice_id_idx" ON "public"."repair_job"("invoice_id");
CREATE INDEX "repair_job_warranty_source_job_id_idx" ON "public"."repair_job"("warranty_source_job_id");
CREATE INDEX "repair_job_part_repair_job_id_idx" ON "public"."repair_job_part"("repair_job_id");
CREATE INDEX "repair_job_part_product_id_idx" ON "public"."repair_job_part"("product_id");

CREATE UNIQUE INDEX "sales_order_order_number_key" ON "public"."sales_order"("order_number");
CREATE INDEX "sales_order_company_id_status_created_at_idx" ON "public"."sales_order"("company_id", "status", "created_at");
CREATE INDEX "sales_order_terminal_id_idx" ON "public"."sales_order"("terminal_id");
CREATE INDEX "sales_order_customer_id_idx" ON "public"."sales_order"("customer_id");
CREATE INDEX "sales_order_created_by_id_idx" ON "public"."sales_order"("created_by_id");
CREATE INDEX "sales_order_invoice_id_idx" ON "public"."sales_order"("invoice_id");
CREATE INDEX "sales_order_item_sales_order_id_idx" ON "public"."sales_order_item"("sales_order_id");
CREATE INDEX "sales_order_item_product_id_idx" ON "public"."sales_order_item"("product_id");

CREATE UNIQUE INDEX "uk_product_variant_company_sku" ON "public"."product_variant"("company_id", "sku");
CREATE UNIQUE INDEX "uk_product_variant_company_barcode" ON "public"."product_variant"("company_id", "barcode");
CREATE INDEX "product_variant_company_id_is_active_idx" ON "public"."product_variant"("company_id", "is_active");
CREATE INDEX "product_variant_product_id_idx" ON "public"."product_variant"("product_id");

CREATE UNIQUE INDEX "uk_product_unit_product_name" ON "public"."product_unit"("product_id", "unit_name");
CREATE UNIQUE INDEX "uk_product_unit_company_barcode" ON "public"."product_unit"("company_id", "unit_barcode");
CREATE INDEX "product_unit_company_id_is_active_idx" ON "public"."product_unit"("company_id", "is_active");
CREATE INDEX "product_unit_product_id_idx" ON "public"."product_unit"("product_id");

CREATE UNIQUE INDEX "uk_product_serial_company_serial" ON "public"."product_serial"("company_id", "serial_number");
CREATE UNIQUE INDEX "uk_product_serial_company_imei" ON "public"."product_serial"("company_id", "imei");
CREATE INDEX "product_serial_company_id_status_idx" ON "public"."product_serial"("company_id", "status");
CREATE INDEX "product_serial_product_id_idx" ON "public"."product_serial"("product_id");
CREATE INDEX "product_serial_variant_id_idx" ON "public"."product_serial"("variant_id");
CREATE INDEX "product_serial_customer_id_idx" ON "public"."product_serial"("customer_id");

CREATE UNIQUE INDEX "uk_product_bundle_component" ON "public"."product_bundle"("parent_product_id", "component_product_id");
CREATE INDEX "product_bundle_company_id_idx" ON "public"."product_bundle"("company_id");
CREATE INDEX "product_bundle_component_product_id_idx" ON "public"."product_bundle"("component_product_id");

CREATE UNIQUE INDEX "pos_open_ticket_ticket_number_key" ON "public"."pos_open_ticket"("ticket_number");
CREATE UNIQUE INDEX "pos_open_ticket_idempotency_key_key" ON "public"."pos_open_ticket"("idempotency_key");
CREATE INDEX "pos_open_ticket_company_id_status_created_at_idx" ON "public"."pos_open_ticket"("company_id", "status", "created_at");
CREATE INDEX "pos_open_ticket_terminal_id_status_idx" ON "public"."pos_open_ticket"("terminal_id", "status");
CREATE INDEX "pos_open_ticket_customer_id_idx" ON "public"."pos_open_ticket"("customer_id");
CREATE INDEX "pos_open_ticket_cashier_id_idx" ON "public"."pos_open_ticket"("cashier_id");
CREATE INDEX "pos_open_ticket_invoice_id_idx" ON "public"."pos_open_ticket"("invoice_id");

CREATE INDEX "prescription_verification_company_id_status_created_at_idx" ON "public"."prescription_verification"("company_id", "status", "created_at");
CREATE INDEX "prescription_verification_terminal_id_idx" ON "public"."prescription_verification"("terminal_id");
CREATE INDEX "prescription_verification_customer_id_idx" ON "public"."prescription_verification"("customer_id");
CREATE INDEX "prescription_verification_product_id_idx" ON "public"."prescription_verification"("product_id");
CREATE INDEX "prescription_verification_invoice_id_idx" ON "public"."prescription_verification"("invoice_id");
CREATE INDEX "prescription_verification_verified_by_id_idx" ON "public"."prescription_verification"("verified_by_id");

CREATE INDEX "customer_company_id_account_type_idx" ON "public"."customer"("company_id", "account_type");

ALTER TABLE "public"."service_booking" ADD CONSTRAINT "service_booking_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."service_booking" ADD CONSTRAINT "service_booking_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."service_booking" ADD CONSTRAINT "service_booking_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."service_booking" ADD CONSTRAINT "service_booking_service_product_id_fkey" FOREIGN KEY ("service_product_id") REFERENCES "public"."product"("uuid_product") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."service_booking" ADD CONSTRAINT "service_booking_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."service_booking" ADD CONSTRAINT "service_booking_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."service_booking" ADD CONSTRAINT "service_booking_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_labor_product_id_fkey" FOREIGN KEY ("labor_product_id") REFERENCES "public"."product"("uuid_product") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job" ADD CONSTRAINT "repair_job_warranty_source_job_id_fkey" FOREIGN KEY ("warranty_source_job_id") REFERENCES "public"."repair_job"("uuid_repair_job") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job_part" ADD CONSTRAINT "repair_job_part_repair_job_id_fkey" FOREIGN KEY ("repair_job_id") REFERENCES "public"."repair_job"("uuid_repair_job") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."repair_job_part" ADD CONSTRAINT "repair_job_part_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."sales_order" ADD CONSTRAINT "sales_order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."sales_order" ADD CONSTRAINT "sales_order_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."sales_order" ADD CONSTRAINT "sales_order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."sales_order" ADD CONSTRAINT "sales_order_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."sales_order" ADD CONSTRAINT "sales_order_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."sales_order_item" ADD CONSTRAINT "sales_order_item_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_order"("uuid_sales_order") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."sales_order_item" ADD CONSTRAINT "sales_order_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."product_variant" ADD CONSTRAINT "product_variant_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_variant" ADD CONSTRAINT "product_variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_unit" ADD CONSTRAINT "product_unit_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_unit" ADD CONSTRAINT "product_unit_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_serial" ADD CONSTRAINT "product_serial_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_serial" ADD CONSTRAINT "product_serial_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_serial" ADD CONSTRAINT "product_serial_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variant"("uuid_product_variant") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."product_serial" ADD CONSTRAINT "product_serial_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."product_bundle" ADD CONSTRAINT "product_bundle_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_bundle" ADD CONSTRAINT "product_bundle_parent_product_id_fkey" FOREIGN KEY ("parent_product_id") REFERENCES "public"."product"("uuid_product") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_bundle" ADD CONSTRAINT "product_bundle_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."pos_open_ticket" ADD CONSTRAINT "pos_open_ticket_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."pos_open_ticket" ADD CONSTRAINT "pos_open_ticket_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."pos_open_ticket" ADD CONSTRAINT "pos_open_ticket_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."pos_open_ticket" ADD CONSTRAINT "pos_open_ticket_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."pos_open_ticket" ADD CONSTRAINT "pos_open_ticket_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."prescription_verification" ADD CONSTRAINT "prescription_verification_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."prescription_verification" ADD CONSTRAINT "prescription_verification_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."prescription_verification" ADD CONSTRAINT "prescription_verification_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."prescription_verification" ADD CONSTRAINT "prescription_verification_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."prescription_verification" ADD CONSTRAINT "prescription_verification_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."prescription_verification" ADD CONSTRAINT "prescription_verification_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
