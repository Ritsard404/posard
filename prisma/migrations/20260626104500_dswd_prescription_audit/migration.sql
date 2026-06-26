ALTER TYPE "public"."discount_type" ADD VALUE IF NOT EXISTS 'DSWD';

ALTER TABLE "public"."item"
  ADD COLUMN "prescription_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "prescription_confirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "prescription_reference" TEXT;
