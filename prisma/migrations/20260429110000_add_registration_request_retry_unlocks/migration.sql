ALTER TABLE "public"."registration_requests"
ADD COLUMN "retry_unlocked_by" UUID,
ADD COLUMN "retry_unlocked_at" TIMESTAMPTZ;

CREATE INDEX "registration_requests_retry_unlocked_by_idx"
ON "public"."registration_requests"("retry_unlocked_by");

ALTER TABLE "public"."registration_requests"
ADD CONSTRAINT "registration_requests_retry_unlocked_by_fkey"
FOREIGN KEY ("retry_unlocked_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
