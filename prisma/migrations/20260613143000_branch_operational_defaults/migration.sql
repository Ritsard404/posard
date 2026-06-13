ALTER TABLE "public"."branch"
  ADD COLUMN "timezone" TEXT DEFAULT 'Asia/Manila',
  ADD COLUMN "currency" TEXT DEFAULT 'PHP',
  ADD COLUMN "tax_mode" TEXT DEFAULT 'inherit',
  ADD COLUMN "tax_rate" DECIMAL(5, 2),
  ADD COLUMN "receipt_footer" TEXT,
  ADD COLUMN "logo_image_url" VARCHAR(500),
  ADD COLUMN "opening_date" DATE,
  ADD COLUMN "invoice_prefix" VARCHAR(20),
  ADD COLUMN "invoice_counter" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "settings" JSONB,
  ADD COLUMN "manager_id" UUID;

UPDATE "public"."branch"
SET
  "opening_date" = COALESCE("opening_date", "created_at"::date),
  "invoice_prefix" = COALESCE(
    "invoice_prefix",
    UPPER(LEFT(REGEXP_REPLACE(COALESCE(NULLIF("code", ''), "name"), '[^A-Za-z0-9]', '', 'g'), 6))
  ),
  "settings" = COALESCE(
    "settings",
    '{
      "receipt": { "inheritCompany": true },
      "inventory": { "trackByBranch": true },
      "printer": { "inheritTerminalDefaults": true },
      "cashDrawer": { "openingCashRequired": true },
      "sales": { "allowOfflineQueue": true },
      "offlineSync": { "enabled": true }
    }'::jsonb
  );

CREATE INDEX "branch_manager_id_idx" ON "public"."branch"("manager_id");

ALTER TABLE "public"."branch"
  ADD CONSTRAINT "branch_manager_id_fkey"
  FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
