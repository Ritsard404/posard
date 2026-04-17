CREATE TABLE "public"."invoice_document" (
    "uuid_invoice_document" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_blob" BYTEA NOT NULL,
    "type" "public"."invoice_document_type" NOT NULL,
    "reprint_count" INTEGER NOT NULL DEFAULT 0,
    "is_train_mode" BOOLEAN NOT NULL DEFAULT false,
    "invoice_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_document_pkey" PRIMARY KEY ("uuid_invoice_document")
);

CREATE INDEX "invoice_document_invoice_id_idx" ON "public"."invoice_document"("invoice_id");
CREATE INDEX "invoice_document_type_created_at_idx" ON "public"."invoice_document"("type", "created_at");

ALTER TABLE "public"."invoice_document"
ADD CONSTRAINT "invoice_document_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice")
ON DELETE SET NULL ON UPDATE CASCADE;
