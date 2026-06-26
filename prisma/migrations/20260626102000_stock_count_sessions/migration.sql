CREATE TYPE "public"."stock_count_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'cancelled');

CREATE TABLE "public"."stock_count_session" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "count_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "created_by_id" UUID NOT NULL,
  "assigned_to_id" UUID,
  "submitted_by_id" UUID,
  "approved_by_id" UUID,
  "status" "public"."stock_count_status" NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitted_at" TIMESTAMPTZ,
  "approved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_count_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."stock_count_item" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "stock_lot_id" UUID,
  "expected_quantity" DECIMAL(19,4) NOT NULL,
  "counted_quantity" DECIMAL(19,4),
  "variance_quantity" DECIMAL(19,4),
  "notes" TEXT,
  "counted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_count_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_count_session_count_number_key"
  ON "public"."stock_count_session"("count_number");

CREATE INDEX "stock_count_session_company_id_status_created_at_idx"
  ON "public"."stock_count_session"("company_id", "status", "created_at");

CREATE INDEX "stock_count_session_assigned_to_id_idx"
  ON "public"."stock_count_session"("assigned_to_id");

CREATE INDEX "stock_count_item_session_id_idx"
  ON "public"."stock_count_item"("session_id");

CREATE INDEX "stock_count_item_product_id_idx"
  ON "public"."stock_count_item"("product_id");

CREATE INDEX "stock_count_item_stock_lot_id_idx"
  ON "public"."stock_count_item"("stock_lot_id");

ALTER TABLE "public"."stock_count_session"
  ADD CONSTRAINT "stock_count_session_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."stock_count_session"
  ADD CONSTRAINT "stock_count_session_created_by_id_fkey"
  FOREIGN KEY ("created_by_id")
  REFERENCES "public"."profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."stock_count_session"
  ADD CONSTRAINT "stock_count_session_assigned_to_id_fkey"
  FOREIGN KEY ("assigned_to_id")
  REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."stock_count_session"
  ADD CONSTRAINT "stock_count_session_submitted_by_id_fkey"
  FOREIGN KEY ("submitted_by_id")
  REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."stock_count_session"
  ADD CONSTRAINT "stock_count_session_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id")
  REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."stock_count_item"
  ADD CONSTRAINT "stock_count_item_session_id_fkey"
  FOREIGN KEY ("session_id")
  REFERENCES "public"."stock_count_session"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."stock_count_item"
  ADD CONSTRAINT "stock_count_item_product_id_fkey"
  FOREIGN KEY ("product_id")
  REFERENCES "public"."product"("uuid_product")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."stock_count_item"
  ADD CONSTRAINT "stock_count_item_stock_lot_id_fkey"
  FOREIGN KEY ("stock_lot_id")
  REFERENCES "public"."stock_lot"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
