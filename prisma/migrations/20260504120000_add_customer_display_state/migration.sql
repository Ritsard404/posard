CREATE TABLE "public"."customer_display_state" (
    "uuid_customer_display_state" UUID NOT NULL DEFAULT gen_random_uuid(),
    "terminal_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_display_state_pkey" PRIMARY KEY ("uuid_customer_display_state")
);

CREATE UNIQUE INDEX "customer_display_state_terminal_id_key" ON "public"."customer_display_state"("terminal_id");
CREATE INDEX "customer_display_state_company_id_idx" ON "public"."customer_display_state"("company_id");
CREATE INDEX "customer_display_state_terminal_id_updated_at_idx" ON "public"."customer_display_state"("terminal_id", "updated_at");

ALTER TABLE "public"."customer_display_state"
ADD CONSTRAINT "customer_display_state_terminal_id_fkey"
FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."customer_display_state" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_display_company_read" ON "public"."customer_display_state";

CREATE POLICY "customer_display_company_read" ON "public"."customer_display_state"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "public"."profiles"
    WHERE "profiles"."user_id" = auth.uid()
      AND "profiles"."status" = 'active'
      AND (
        "profiles"."role" = 'admin'
        OR "profiles"."company_id" = "customer_display_state"."company_id"
      )
  )
);

GRANT SELECT ON "public"."customer_display_state" TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "public"."customer_display_state";
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
