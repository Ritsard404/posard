ALTER TABLE "public"."system_configuration"
ALTER COLUMN "direct_registration_enabled" SET DEFAULT true;

UPDATE "public"."system_configuration"
SET "direct_registration_enabled" = true,
    "updated_at" = NOW()
WHERE "direct_registration_enabled" = false;
