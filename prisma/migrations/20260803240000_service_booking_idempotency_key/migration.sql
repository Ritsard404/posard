ALTER TABLE "public"."service_booking"
  ADD COLUMN IF NOT EXISTS "idempotency_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "service_booking_idempotency_key_key"
  ON "public"."service_booking" ("idempotency_key");
