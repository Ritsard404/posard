DROP INDEX IF EXISTS "public"."invoice_invoice_number_key";

CREATE UNIQUE INDEX "uk_invoice_terminal_invoice_number"
ON "public"."invoice"("uuid_pos_terminal", "invoice_number");
