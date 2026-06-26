ALTER TABLE "public"."product"
  ADD COLUMN "pos_favorite" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "public"."revenue_goal" (
  "uuid_revenue_goal" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "month" DATE NOT NULL,
  "target_amount" DECIMAL(19,4) NOT NULL,
  "notes" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "revenue_goal_pkey" PRIMARY KEY ("uuid_revenue_goal")
);

CREATE UNIQUE INDEX "uk_revenue_goal_company_month"
  ON "public"."revenue_goal"("company_id", "month");

CREATE INDEX "revenue_goal_company_id_month_idx"
  ON "public"."revenue_goal"("company_id", "month");

CREATE INDEX "revenue_goal_created_by_id_idx"
  ON "public"."revenue_goal"("created_by_id");

CREATE INDEX "product_uuid_company_pos_favorite_idx"
  ON "public"."product"("uuid_company", "pos_favorite");

ALTER TABLE "public"."revenue_goal"
  ADD CONSTRAINT "revenue_goal_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."revenue_goal"
  ADD CONSTRAINT "revenue_goal_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
