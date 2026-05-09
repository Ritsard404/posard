-- CreateTable
CREATE TABLE "public"."invoice_return" (
    "uuid_invoice_return" UUID NOT NULL DEFAULT gen_random_uuid(),
    "return_number" INTEGER NOT NULL,
    "return_type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "subtotal_returned" DECIMAL(15,2) NOT NULL,
    "total_returned" DECIMAL(15,2) NOT NULL,
    "company_id" UUID NOT NULL,
    "terminal_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "processed_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_return_pkey" PRIMARY KEY ("uuid_invoice_return")
);

-- CreateTable
CREATE TABLE "public"."invoice_return_item" (
    "uuid_invoice_return_item" UUID NOT NULL DEFAULT gen_random_uuid(),
    "returned_qty" DECIMAL(19,4) NOT NULL,
    "unit_price_snapshot" DECIMAL(19,4) NOT NULL,
    "line_amount" DECIMAL(15,2) NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "selections_snapshot" JSONB,
    "return_id" UUID NOT NULL,
    "invoice_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_return_item_pkey" PRIMARY KEY ("uuid_invoice_return_item")
);

-- CreateIndex
CREATE UNIQUE INDEX "uk_invoice_return_terminal_return_number" ON "public"."invoice_return"("terminal_id", "return_number");

-- CreateIndex
CREATE INDEX "invoice_return_company_id_created_at_idx" ON "public"."invoice_return"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "invoice_return_terminal_id_created_at_idx" ON "public"."invoice_return"("terminal_id", "created_at");

-- CreateIndex
CREATE INDEX "invoice_return_invoice_id_idx" ON "public"."invoice_return"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_return_processed_by_id_idx" ON "public"."invoice_return"("processed_by_id");

-- CreateIndex
CREATE INDEX "invoice_return_approved_by_id_idx" ON "public"."invoice_return"("approved_by_id");

-- CreateIndex
CREATE INDEX "invoice_return_item_return_id_idx" ON "public"."invoice_return_item"("return_id");

-- CreateIndex
CREATE INDEX "invoice_return_item_invoice_item_id_idx" ON "public"."invoice_return_item"("invoice_item_id");

-- CreateIndex
CREATE INDEX "invoice_return_item_product_id_idx" ON "public"."invoice_return_item"("product_id");

-- AddForeignKey
ALTER TABLE "public"."invoice_return" ADD CONSTRAINT "invoice_return_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_return" ADD CONSTRAINT "invoice_return_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "public"."pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_return" ADD CONSTRAINT "invoice_return_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("uuid_invoice") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_return" ADD CONSTRAINT "invoice_return_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_return" ADD CONSTRAINT "invoice_return_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_return_item" ADD CONSTRAINT "invoice_return_item_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."invoice_return"("uuid_invoice_return") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_return_item" ADD CONSTRAINT "invoice_return_item_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "public"."item"("uuid_item") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_return_item" ADD CONSTRAINT "invoice_return_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;
