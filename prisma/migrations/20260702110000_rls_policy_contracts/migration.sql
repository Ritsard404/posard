ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."registration_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."customer_display_state" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_or_admin_read" ON "public"."profiles";

CREATE POLICY "profiles_self_or_admin_read" ON "public"."profiles"
FOR SELECT
TO authenticated
USING (
  "profiles"."user_id" = (SELECT auth.uid())
  OR public.is_admin((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "registration_requests_admin_read" ON "public"."registration_requests";
DROP POLICY IF EXISTS "registration_requests_admin_update" ON "public"."registration_requests";

CREATE POLICY "registration_requests_admin_read" ON "public"."registration_requests"
FOR SELECT
TO authenticated
USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "registration_requests_admin_update" ON "public"."registration_requests"
FOR UPDATE
TO authenticated
USING (public.is_admin((SELECT auth.uid())))
WITH CHECK (public.is_admin((SELECT auth.uid())));
