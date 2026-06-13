CREATE TABLE "public"."branch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "code" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "company_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branch_company_id_name_key" ON "public"."branch"("company_id", "name");
CREATE UNIQUE INDEX "branch_company_id_code_key" ON "public"."branch"("company_id", "code");
CREATE INDEX "branch_company_id_is_active_idx" ON "public"."branch"("company_id", "is_active");

ALTER TABLE "public"."branch"
  ADD CONSTRAINT "branch_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."profiles" ADD COLUMN "branch_id" UUID;
ALTER TABLE "public"."pos_terminal_info" ADD COLUMN "branch_id" UUID;
ALTER TABLE "public"."timestamp" ADD COLUMN "branch_id" UUID;
ALTER TABLE "public"."invoice" ADD COLUMN "branch_id" UUID;

INSERT INTO "public"."branch" ("name", "code", "address", "company_id", "created_at", "updated_at")
SELECT
  'Default Branch',
  'DEFAULT',
  "address",
  "uuid_company",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "public"."company"
ON CONFLICT ("company_id", "name") DO NOTHING;

UPDATE "public"."profiles" profile
SET "branch_id" = branch."id"
FROM "public"."branch" branch
WHERE profile."company_id" = branch."company_id"
  AND branch."name" = 'Default Branch'
  AND profile."role" = 'cashier'
  AND profile."branch_id" IS NULL;

UPDATE "public"."pos_terminal_info" terminal
SET "branch_id" = branch."id"
FROM "public"."branch" branch
WHERE terminal."company_id" = branch."company_id"
  AND branch."name" = 'Default Branch'
  AND terminal."branch_id" IS NULL;

UPDATE "public"."timestamp" timestamp_row
SET "branch_id" = terminal."branch_id"
FROM "public"."pos_terminal_info" terminal
WHERE timestamp_row."pos_terminal_id" = terminal."uuid_pos_terminal"
  AND timestamp_row."branch_id" IS NULL;

UPDATE "public"."invoice" invoice
SET "branch_id" = terminal."branch_id"
FROM "public"."pos_terminal_info" terminal
WHERE invoice."uuid_pos_terminal" = terminal."uuid_pos_terminal"
  AND invoice."branch_id" IS NULL;

CREATE INDEX "profiles_branch_id_idx" ON "public"."profiles"("branch_id");
CREATE INDEX "pos_terminal_info_branch_id_idx" ON "public"."pos_terminal_info"("branch_id");
CREATE INDEX "timestamp_branch_id_idx" ON "public"."timestamp"("branch_id");
CREATE INDEX "invoice_branch_id_idx" ON "public"."invoice"("branch_id");

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."pos_terminal_info"
  ADD CONSTRAINT "pos_terminal_info_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."timestamp"
  ADD CONSTRAINT "timestamp_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."invoice"
  ADD CONSTRAINT "invoice_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
