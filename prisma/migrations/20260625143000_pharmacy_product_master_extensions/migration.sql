ALTER TABLE "public"."product"
  ADD COLUMN "generic_name" TEXT,
  ADD COLUMN "brand_name" TEXT,
  ADD COLUMN "shelf_location" TEXT,
  ADD COLUMN "prescription_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reorder_point" DECIMAL(19,4),
  ADD COLUMN "preferred_supplier_id" UUID;

ALTER TABLE "public"."product"
  ADD CONSTRAINT "product_preferred_supplier_id_fkey"
  FOREIGN KEY ("preferred_supplier_id")
  REFERENCES "public"."supplier"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "product_preferred_supplier_id_idx"
  ON "public"."product"("preferred_supplier_id");

CREATE INDEX "product_company_generic_name_idx"
  ON "public"."product"("uuid_company", "generic_name");

CREATE INDEX "product_company_brand_name_idx"
  ON "public"."product"("uuid_company", "brand_name");
