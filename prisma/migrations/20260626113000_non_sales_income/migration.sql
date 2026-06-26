CREATE TABLE "public"."non_sales_income" (
  "uuid_non_sales_income" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reference_number" TEXT NOT NULL,
  "company_id" UUID NOT NULL,
  "terminal_id" UUID,
  "created_by_id" UUID NOT NULL,
  "income_date" DATE NOT NULL,
  "source" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "external_reference" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "non_sales_income_pkey" PRIMARY KEY ("uuid_non_sales_income")
);

CREATE UNIQUE INDEX "non_sales_income_reference_number_key"
  ON "public"."non_sales_income"("reference_number");

CREATE INDEX "non_sales_income_company_id_income_date_idx"
  ON "public"."non_sales_income"("company_id", "income_date");

CREATE INDEX "non_sales_income_terminal_id_idx"
  ON "public"."non_sales_income"("terminal_id");

CREATE INDEX "non_sales_income_source_idx"
  ON "public"."non_sales_income"("source");

CREATE INDEX "non_sales_income_created_by_id_idx"
  ON "public"."non_sales_income"("created_by_id");

ALTER TABLE "public"."non_sales_income"
  ADD CONSTRAINT "non_sales_income_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."non_sales_income"
  ADD CONSTRAINT "non_sales_income_terminal_id_fkey"
  FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."non_sales_income"
  ADD CONSTRAINT "non_sales_income_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
