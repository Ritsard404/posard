CREATE TYPE "public"."platform_billing_mode" AS ENUM ('FREE', 'PAID');

ALTER TABLE "public"."system_configuration"
ADD COLUMN "platform_billing_mode" "public"."platform_billing_mode" NOT NULL DEFAULT 'FREE',
ADD COLUMN "donation_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "donation_title" VARCHAR(120),
ADD COLUMN "donation_message" VARCHAR(500),
ADD COLUMN "donation_image_url" VARCHAR(500),
ADD COLUMN "donation_provider_name" VARCHAR(120),
ADD COLUMN "donation_account_holder" VARCHAR(160),
ADD COLUMN "donation_account_detail" VARCHAR(240),
ADD COLUMN "donation_notes" TEXT;
