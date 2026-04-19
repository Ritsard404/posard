ALTER TABLE "public"."company"
  ADD COLUMN "address" TEXT;

ALTER TABLE "public"."pos_terminal_info"
  ALTER COLUMN "min_number" DROP NOT NULL,
  ALTER COLUMN "accreditation_number" DROP NOT NULL,
  ALTER COLUMN "ptu_number" DROP NOT NULL,
  ALTER COLUMN "pos_name" DROP NOT NULL,
  ALTER COLUMN "registered_name" DROP NOT NULL,
  ALTER COLUMN "operated_by" DROP NOT NULL,
  ALTER COLUMN "address" DROP NOT NULL,
  ALTER COLUMN "vat_tin_number" DROP NOT NULL,
  ALTER COLUMN "vat" DROP NOT NULL,
  ALTER COLUMN "discount_max" DROP NOT NULL,
  ALTER COLUMN "printer_name" DROP NOT NULL,
  DROP COLUMN "db_name",
  DROP COLUMN "cost_center",
  DROP COLUMN "branch_center",
  DROP COLUMN "use_center";
