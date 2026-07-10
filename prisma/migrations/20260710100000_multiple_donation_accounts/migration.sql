CREATE TABLE "public"."donation_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "system_configuration_id" TEXT NOT NULL,
  "label" VARCHAR(120),
  "provider_name" VARCHAR(120),
  "account_holder" VARCHAR(160),
  "account_detail" VARCHAR(240),
  "image_url" VARCHAR(500),
  "notes" VARCHAR(500),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "donation_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "donation_accounts_system_configuration_id_fkey"
    FOREIGN KEY ("system_configuration_id")
    REFERENCES "public"."system_configuration"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "donation_accounts_system_configuration_id_enabled_display_order_idx"
  ON "public"."donation_accounts"("system_configuration_id", "enabled", "display_order");

INSERT INTO "public"."donation_accounts" (
  "system_configuration_id",
  "label",
  "provider_name",
  "account_holder",
  "account_detail",
  "image_url",
  "notes",
  "enabled",
  "display_order"
)
SELECT
  "id",
  COALESCE(NULLIF("donation_provider_name", ''), 'Donation account'),
  "donation_provider_name",
  "donation_account_holder",
  "donation_account_detail",
  "donation_image_url",
  CASE
    WHEN "donation_notes" IS NULL THEN NULL
    ELSE LEFT("donation_notes", 500)
  END,
  true,
  0
FROM "public"."system_configuration"
WHERE
  "donation_image_url" IS NOT NULL
  OR "donation_provider_name" IS NOT NULL
  OR "donation_account_holder" IS NOT NULL
  OR "donation_account_detail" IS NOT NULL;
