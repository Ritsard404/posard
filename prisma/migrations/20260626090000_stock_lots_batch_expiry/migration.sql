CREATE TYPE "public"."stock_lot_status" AS ENUM ('available', 'depleted', 'expired', 'blocked');

ALTER TABLE "public"."receiving_item"
  ADD COLUMN "batch_number" TEXT,
  ADD COLUMN "expiry_date" DATE,
  ADD COLUMN "shelf_location" TEXT;

CREATE TABLE "public"."stock_lot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "supplier_id" UUID,
  "receiving_item_id" UUID,
  "batch_number" TEXT,
  "expiry_date" DATE,
  "unit_cost" DECIMAL(19,4) NOT NULL,
  "initial_quantity" DECIMAL(19,4) NOT NULL,
  "quantity_on_hand" DECIMAL(19,4) NOT NULL,
  "shelf_location" TEXT,
  "status" "public"."stock_lot_status" NOT NULL DEFAULT 'available',
  "received_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_lot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."stock_lot"
  ADD CONSTRAINT "stock_lot_company_id_fkey"
  FOREIGN KEY ("company_id")
  REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "public"."stock_lot"
  ADD CONSTRAINT "stock_lot_product_id_fkey"
  FOREIGN KEY ("product_id")
  REFERENCES "public"."product"("uuid_product")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "public"."stock_lot"
  ADD CONSTRAINT "stock_lot_supplier_id_fkey"
  FOREIGN KEY ("supplier_id")
  REFERENCES "public"."supplier"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "public"."stock_lot"
  ADD CONSTRAINT "stock_lot_receiving_item_id_fkey"
  FOREIGN KEY ("receiving_item_id")
  REFERENCES "public"."receiving_item"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX "stock_lot_receiving_item_id_key"
  ON "public"."stock_lot"("receiving_item_id");

CREATE INDEX "stock_lot_company_id_status_expiry_date_idx"
  ON "public"."stock_lot"("company_id", "status", "expiry_date");

CREATE INDEX "stock_lot_product_id_expiry_date_idx"
  ON "public"."stock_lot"("product_id", "expiry_date");

CREATE INDEX "stock_lot_supplier_id_idx"
  ON "public"."stock_lot"("supplier_id");

ALTER TABLE "public"."stock_movement"
  ADD COLUMN "stock_lot_id" UUID,
  ADD COLUMN "lot_quantity_before" DECIMAL(19,4),
  ADD COLUMN "lot_quantity_after" DECIMAL(19,4);

ALTER TABLE "public"."stock_movement"
  ADD CONSTRAINT "stock_movement_stock_lot_id_fkey"
  FOREIGN KEY ("stock_lot_id")
  REFERENCES "public"."stock_lot"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "stock_movement_stock_lot_id_idx"
  ON "public"."stock_movement"("stock_lot_id");
