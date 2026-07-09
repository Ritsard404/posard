ALTER TABLE "public"."sale_type"
  ADD COLUMN "company_id" UUID,
  ADD COLUMN "payment_qr_image_url" VARCHAR(500),
  ADD COLUMN "payment_account_holder" VARCHAR(160),
  ADD COLUMN "payment_account_number" VARCHAR(240),
  ADD COLUMN "payment_provider_name" VARCHAR(120),
  ADD COLUMN "payment_instructions" VARCHAR(500),
  ADD COLUMN "payment_display_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "payment_display_order" INTEGER,
  ADD COLUMN "payment_details_updated_at" TIMESTAMPTZ;

ALTER TABLE "public"."sale_type"
  ADD CONSTRAINT "sale_type_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "sale_type_company_id_type_idx"
  ON "public"."sale_type"("company_id", "type");
