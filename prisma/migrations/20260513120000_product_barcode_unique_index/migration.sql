-- Ensure barcode lookups are indexed per company. Different companies may use
-- the same manufacturer barcode, but one company cannot assign the same code
-- to multiple products.
DROP INDEX IF EXISTS "public"."uk_product_barcode";

CREATE UNIQUE INDEX IF NOT EXISTS "uk_product_company_barcode"
  ON "public"."product"("uuid_company", "barcode");
