CREATE TYPE "public"."offline_sync_issue_status" AS ENUM ('pending', 'syncing', 'failed', 'needs_review', 'resolved', 'dismissed');
CREATE TYPE "public"."expense_status" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'posted', 'cancelled');
CREATE TYPE "public"."stock_movement_type" AS ENUM ('opening_balance', 'stock_in', 'stock_out', 'sale_deduction', 'return_in', 'return_out', 'adjustment', 'transfer_out', 'transfer_in', 'waste', 'receiving_variance');
CREATE TYPE "public"."supplier_status" AS ENUM ('active', 'inactive');
CREATE TYPE "public"."purchase_order_status" AS ENUM ('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'fully_received', 'cancelled');
CREATE TYPE "public"."receiving_status" AS ENUM ('draft', 'posted', 'cancelled');
CREATE TYPE "public"."branch_transfer_status" AS ENUM ('draft', 'pending_approval', 'approved', 'dispatched', 'in_transit', 'partially_received', 'received', 'cancelled', 'disputed');
CREATE TYPE "public"."loyalty_transaction_type" AS ENUM ('earn', 'redeem', 'adjust', 'expire');
CREATE TYPE "public"."promotion_type" AS ENUM ('fixed_amount', 'percentage', 'item_level', 'order_level', 'buy_x_get_y', 'bundle_price', 'quantity_threshold');
CREATE TYPE "public"."kitchen_ticket_status" AS ENUM ('queued', 'preparing', 'ready', 'served', 'cancelled');

CREATE TABLE "public"."offline_sync_issue" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "local_id" TEXT NOT NULL,
  "action_type" TEXT NOT NULL,
  "sync_status" "public"."offline_sync_issue_status" NOT NULL DEFAULT 'failed',
  "conflict_category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "idempotency_key" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "next_retry_at" TIMESTAMPTZ,
  "payload" JSONB,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offline_sync_issue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."expense_category" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."expense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "category_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "approved_by_id" UUID,
  "expense_date" DATE NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "notes" TEXT,
  "status" "public"."expense_status" NOT NULL DEFAULT 'posted',
  "approval_request_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."stock_movement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "product_id" UUID NOT NULL,
  "created_by_id" UUID,
  "movement_type" "public"."stock_movement_type" NOT NULL,
  "quantity_delta" DECIMAL(19,4) NOT NULL,
  "quantity_before" DECIMAL(19,4),
  "quantity_after" DECIMAL(19,4),
  "unit_cost" DECIMAL(19,4),
  "source_type" TEXT,
  "source_id" TEXT,
  "reference_number" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."supplier" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "contact_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "status" "public"."supplier_status" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."purchase_order" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "po_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "approved_by_id" UUID,
  "status" "public"."purchase_order_status" NOT NULL DEFAULT 'draft',
  "expected_at" DATE,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."purchase_order_item" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "purchase_order_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(19,4) NOT NULL,
  "unit_cost" DECIMAL(19,4) NOT NULL,
  "received_quantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
  CONSTRAINT "purchase_order_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."receiving_record" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "receiving_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "purchase_order_id" UUID,
  "posted_by_id" UUID,
  "status" "public"."receiving_status" NOT NULL DEFAULT 'draft',
  "posted_at" TIMESTAMPTZ,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receiving_record_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."receiving_item" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "receiving_record_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity_received" DECIMAL(19,4) NOT NULL,
  "unit_cost" DECIMAL(19,4) NOT NULL,
  "variance_quantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
  CONSTRAINT "receiving_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."branch_transfer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transfer_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "source_terminal_id" UUID NOT NULL,
  "destination_terminal_id" UUID NOT NULL,
  "requested_by_id" UUID NOT NULL,
  "approved_by_id" UUID,
  "received_by_id" UUID,
  "status" "public"."branch_transfer_status" NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branch_transfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."branch_transfer_item" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "branch_transfer_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "requested_quantity" DECIMAL(19,4) NOT NULL,
  "dispatched_quantity" DECIMAL(19,4),
  "received_quantity" DECIMAL(19,4),
  "variance_quantity" DECIMAL(19,4),
  CONSTRAINT "branch_transfer_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."loyalty_transaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "invoice_id" UUID,
  "created_by_id" UUID,
  "transaction_type" "public"."loyalty_transaction_type" NOT NULL,
  "points_delta" INTEGER NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."promotion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "promotion_type" "public"."promotion_type" NOT NULL,
  "value" DECIMAL(15,2) NOT NULL,
  "starts_at" TIMESTAMPTZ,
  "ends_at" TIMESTAMPTZ,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "stackable" BOOLEAN NOT NULL DEFAULT false,
  "exclusive" BOOLEAN NOT NULL DEFAULT false,
  "rule_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."promotion_redemption_log" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "promotion_id" UUID NOT NULL,
  "invoice_id" UUID,
  "product_id" UUID,
  "discount_amount" DECIMAL(15,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_redemption_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."kitchen_ticket" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticket_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "item_id" UUID,
  "status" "public"."kitchen_ticket_status" NOT NULL DEFAULT 'queued',
  "station" TEXT,
  "notes" TEXT,
  "updated_by_id" UUID,
  "ready_at" TIMESTAMPTZ,
  "served_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kitchen_ticket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offline_sync_issue_company_id_local_id_key" ON "public"."offline_sync_issue"("company_id", "local_id");
CREATE UNIQUE INDEX "expense_category_company_id_name_key" ON "public"."expense_category"("company_id", "name");
CREATE UNIQUE INDEX "expense_reference_number_key" ON "public"."expense"("reference_number");
CREATE UNIQUE INDEX "purchase_order_po_number_key" ON "public"."purchase_order"("po_number");
CREATE UNIQUE INDEX "receiving_record_receiving_number_key" ON "public"."receiving_record"("receiving_number");
CREATE UNIQUE INDEX "branch_transfer_transfer_number_key" ON "public"."branch_transfer"("transfer_number");
CREATE UNIQUE INDEX "kitchen_ticket_ticket_number_key" ON "public"."kitchen_ticket"("ticket_number");

CREATE INDEX "offline_sync_issue_company_id_sync_status_created_at_idx" ON "public"."offline_sync_issue"("company_id", "sync_status", "created_at");
CREATE INDEX "expense_company_id_expense_date_idx" ON "public"."expense"("company_id", "expense_date");
CREATE INDEX "stock_movement_company_id_created_at_idx" ON "public"."stock_movement"("company_id", "created_at");
CREATE INDEX "stock_movement_product_id_created_at_idx" ON "public"."stock_movement"("product_id", "created_at");
CREATE INDEX "supplier_company_id_status_idx" ON "public"."supplier"("company_id", "status");
CREATE INDEX "purchase_order_company_id_status_created_at_idx" ON "public"."purchase_order"("company_id", "status", "created_at");
CREATE INDEX "receiving_record_company_id_status_created_at_idx" ON "public"."receiving_record"("company_id", "status", "created_at");
CREATE INDEX "branch_transfer_company_id_status_created_at_idx" ON "public"."branch_transfer"("company_id", "status", "created_at");
CREATE INDEX "loyalty_transaction_customer_id_created_at_idx" ON "public"."loyalty_transaction"("customer_id", "created_at");
CREATE INDEX "promotion_company_id_is_active_idx" ON "public"."promotion"("company_id", "is_active");
CREATE INDEX "kitchen_ticket_company_id_status_created_at_idx" ON "public"."kitchen_ticket"("company_id", "status", "created_at");

ALTER TABLE "public"."offline_sync_issue" ADD CONSTRAINT "offline_sync_issue_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."offline_sync_issue" ADD CONSTRAINT "offline_sync_issue_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."expense_category" ADD CONSTRAINT "expense_category_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."expense_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."expense" ADD CONSTRAINT "expense_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."stock_movement" ADD CONSTRAINT "stock_movement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."stock_movement" ADD CONSTRAINT "stock_movement_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."stock_movement" ADD CONSTRAINT "stock_movement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."stock_movement" ADD CONSTRAINT "stock_movement_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."supplier" ADD CONSTRAINT "supplier_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_order" ADD CONSTRAINT "purchase_order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_order" ADD CONSTRAINT "purchase_order_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_order" ADD CONSTRAINT "purchase_order_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_order" ADD CONSTRAINT "purchase_order_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_order_item" ADD CONSTRAINT "purchase_order_item_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."purchase_order_item" ADD CONSTRAINT "purchase_order_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."receiving_record" ADD CONSTRAINT "receiving_record_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."receiving_record" ADD CONSTRAINT "receiving_record_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."receiving_record" ADD CONSTRAINT "receiving_record_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."receiving_record" ADD CONSTRAINT "receiving_record_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."receiving_item" ADD CONSTRAINT "receiving_item_receiving_record_id_fkey" FOREIGN KEY ("receiving_record_id") REFERENCES "public"."receiving_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."receiving_item" ADD CONSTRAINT "receiving_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer" ADD CONSTRAINT "branch_transfer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer" ADD CONSTRAINT "branch_transfer_source_terminal_id_fkey" FOREIGN KEY ("source_terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer" ADD CONSTRAINT "branch_transfer_destination_terminal_id_fkey" FOREIGN KEY ("destination_terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer" ADD CONSTRAINT "branch_transfer_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer" ADD CONSTRAINT "branch_transfer_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer" ADD CONSTRAINT "branch_transfer_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer_item" ADD CONSTRAINT "branch_transfer_item_branch_transfer_id_fkey" FOREIGN KEY ("branch_transfer_id") REFERENCES "public"."branch_transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."branch_transfer_item" ADD CONSTRAINT "branch_transfer_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."loyalty_transaction" ADD CONSTRAINT "loyalty_transaction_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."promotion" ADD CONSTRAINT "promotion_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."promotion_redemption_log" ADD CONSTRAINT "promotion_redemption_log_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."promotion_redemption_log" ADD CONSTRAINT "promotion_redemption_log_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."promotion_redemption_log" ADD CONSTRAINT "promotion_redemption_log_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."kitchen_ticket" ADD CONSTRAINT "kitchen_ticket_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."kitchen_ticket" ADD CONSTRAINT "kitchen_ticket_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."kitchen_ticket" ADD CONSTRAINT "kitchen_ticket_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."kitchen_ticket" ADD CONSTRAINT "kitchen_ticket_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."item"("uuid_item") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."kitchen_ticket" ADD CONSTRAINT "kitchen_ticket_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
