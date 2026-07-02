CREATE TABLE IF NOT EXISTS "public"."rate_limit_counter" (
  "key" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "reset_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "rate_limit_counter_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "rate_limit_counter_bucket_reset_at_idx"
  ON "public"."rate_limit_counter" ("bucket", "reset_at");

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE public.profiles.user_id = $1
      AND public.profiles.role = 'admin'
      AND public.profiles.status = 'active'
  );
$function$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "customer_display_company_read" ON "public"."customer_display_state";

CREATE POLICY "customer_display_company_read" ON "public"."customer_display_state"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM "public"."profiles"
    WHERE "profiles"."user_id" = (SELECT auth.uid())
      AND "profiles"."status" = 'active'
      AND (
        "profiles"."role" = 'admin'
        OR "profiles"."company_id" = "customer_display_state"."company_id"
      )
  )
);
