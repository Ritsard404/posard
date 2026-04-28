DO $$ BEGIN
    CREATE TYPE "public"."registration_request_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "public"."registration_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT,
    "requested_role" "public"."user_role" NOT NULL DEFAULT 'manager',
    "status" "public"."registration_request_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registration_requests_email_status_idx" ON "public"."registration_requests"("email", "status");
CREATE INDEX "registration_requests_status_created_at_idx" ON "public"."registration_requests"("status", "created_at");
CREATE INDEX "registration_requests_reviewed_by_idx" ON "public"."registration_requests"("reviewed_by");
CREATE UNIQUE INDEX "registration_requests_pending_email_key" ON "public"."registration_requests"(LOWER("email")) WHERE "status" = 'pending';

ALTER TABLE "public"."registration_requests"
ADD CONSTRAINT "registration_requests_reviewed_by_fkey"
FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
