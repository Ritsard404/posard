ALTER TABLE "public"."invoice"
  ADD COLUMN "customer_id" UUID;

UPDATE "public"."invoice" AS invoice
SET "customer_id" = debt."customer_id"
FROM "public"."customer_debt" AS debt
WHERE debt."invoice_id" = invoice."uuid_invoice"
  AND invoice."customer_id" IS NULL;

UPDATE "public"."invoice" AS invoice
SET "customer_id" = loyalty."customer_id"
FROM "public"."loyalty_transaction" AS loyalty
WHERE loyalty."invoice_id" = invoice."uuid_invoice"
  AND invoice."customer_id" IS NULL;

CREATE INDEX "invoice_customer_id_created_at_idx"
  ON "public"."invoice"("customer_id", "created_at");

ALTER TABLE "public"."invoice"
  ADD CONSTRAINT "invoice_customer_id_fkey"
  FOREIGN KEY ("customer_id")
  REFERENCES "public"."customer"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
