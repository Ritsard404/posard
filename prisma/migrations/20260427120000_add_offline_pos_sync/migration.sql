ALTER TABLE "public"."timestamp"
ADD COLUMN "device_id" TEXT,
ADD COLUMN "last_seen_at" TIMESTAMPTZ,
ADD COLUMN "force_closed_at" TIMESTAMPTZ,
ADD COLUMN "force_closed_by_id" UUID,
ADD COLUMN "force_close_reason" TEXT;

ALTER TABLE "public"."invoice"
ADD COLUMN "idempotency_key" TEXT,
ADD COLUMN "source_device_id" TEXT,
ADD COLUMN "source_timestamp_id" UUID,
ADD COLUMN "local_invoice_no" TEXT;

ALTER TABLE "public"."timestamp"
ADD CONSTRAINT "timestamp_force_closed_by_id_fkey"
FOREIGN KEY ("force_closed_by_id") REFERENCES "public"."profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "timestamp_device_id_idx"
ON "public"."timestamp"("device_id");

CREATE UNIQUE INDEX "timestamp_one_active_terminal_device_idx"
ON "public"."timestamp"("pos_terminal_id")
WHERE "timestamp_out" IS NULL;

CREATE UNIQUE INDEX "invoice_idempotency_key_key"
ON "public"."invoice"("idempotency_key");
