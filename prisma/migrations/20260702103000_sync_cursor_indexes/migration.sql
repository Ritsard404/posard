ALTER TABLE "public"."product_modifier_group"
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX "category_company_id_updated_at_idx"
  ON "public"."category"("uuid_company", "updated_at");

CREATE INDEX "product_company_id_updated_at_idx"
  ON "public"."product"("uuid_company", "updated_at");

CREATE INDEX "modifier_group_company_id_updated_at_idx"
  ON "public"."modifier_group"("company_id", "updated_at");

CREATE INDEX "modifier_option_updated_at_idx"
  ON "public"."modifier_option"("updated_at");

CREATE INDEX "product_modifier_group_updated_at_idx"
  ON "public"."product_modifier_group"("updated_at");

CREATE INDEX "sale_type_updated_at_idx"
  ON "public"."sale_type"("updated_at");

CREATE INDEX "stock_lot_company_id_updated_at_idx"
  ON "public"."stock_lot"("company_id", "updated_at");
