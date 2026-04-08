-- CreateEnum
CREATE TYPE "discount_type" AS ENUM ('PWD', 'SENIOR', 'OTHERS');

-- CreateEnum
CREATE TYPE "invoice_document_type" AS ENUM ('INVOICE', 'ZREPORT', 'XREPORT');

-- CreateEnum
CREATE TYPE "invoice_status_type" AS ENUM ('CANCELLED', 'RETURNED', 'VOID', 'PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "sale_type_enums" AS ENUM ('CARD', 'EPAYMENT');

-- CreateTable
CREATE TABLE "sale_type" (
    "uuid_sale_type" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "account" TEXT,
    "type" "sale_type_enums" NOT NULL DEFAULT 'EPAYMENT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sale_type_pkey" PRIMARY KEY ("uuid_sale_type")
);

-- CreateTable
CREATE TABLE "invoice" (
    "uuid_invoice" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_number" INTEGER NOT NULL,
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "sub_total" DECIMAL(15,2),
    "cash_tendered" DECIMAL(15,2),
    "due_amount" DECIMAL(15,2),
    "total_tendered" DECIMAL(15,2),
    "change_amount" DECIMAL(15,2),
    "vat_sales" DECIMAL(15,2),
    "vat_exempt" DECIMAL(15,2),
    "vat_amount" DECIMAL(15,2),
    "vat_zero" DECIMAL(15,2),
    "customer_name" TEXT NOT NULL DEFAULT 'Walk-in Customer',
    "eligible_disc_name" TEXT,
    "osca_id_num" TEXT,
    "discount_type" TEXT,
    "discount_percent" INTEGER,
    "discount_amount" DECIMAL(15,2),
    "returned_amount" DECIMAL(15,2),
    "reason" TEXT,
    "status" "invoice_status_type" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_train_mode" BOOLEAN NOT NULL DEFAULT false,
    "uuid_pos_terminal" UUID NOT NULL,
    "cashier_id" UUID NOT NULL,
    "voided_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("uuid_invoice")
);

-- CreateTable
CREATE TABLE "item" (
    "uuid_item" UUID NOT NULL DEFAULT gen_random_uuid(),
    "qty" DECIMAL(19,4) NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "subtotal" DECIMAL(19,4) NOT NULL,
    "status" "invoice_status_type" NOT NULL,
    "is_training_mode" BOOLEAN NOT NULL DEFAULT false,
    "uuid_product" UUID NOT NULL,
    "uuid_invoice" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("uuid_item")
);

-- CreateTable
CREATE TABLE "e_payment" (
    "uuid_e_payment" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "uuid_invoice" UUID NOT NULL,
    "uuid_sale_type" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "e_payment_pkey" PRIMARY KEY ("uuid_e_payment")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoice_number_key" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "invoice_uuid_pos_terminal_idx" ON "invoice"("uuid_pos_terminal");

-- CreateIndex
CREATE INDEX "invoice_cashier_id_idx" ON "invoice"("cashier_id");

-- CreateIndex
CREATE INDEX "invoice_voided_by_idx" ON "invoice"("voided_by");

-- CreateIndex
CREATE INDEX "item_uuid_product_idx" ON "item"("uuid_product");

-- CreateIndex
CREATE INDEX "item_uuid_invoice_idx" ON "item"("uuid_invoice");

-- CreateIndex
CREATE UNIQUE INDEX "e_payment_reference_key" ON "e_payment"("reference");

-- CreateIndex
CREATE INDEX "e_payment_uuid_invoice_idx" ON "e_payment"("uuid_invoice");

-- CreateIndex
CREATE INDEX "e_payment_uuid_sale_type_idx" ON "e_payment"("uuid_sale_type");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_uuid_pos_terminal_fkey" FOREIGN KEY ("uuid_pos_terminal") REFERENCES "pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_uuid_product_fkey" FOREIGN KEY ("uuid_product") REFERENCES "product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_uuid_invoice_fkey" FOREIGN KEY ("uuid_invoice") REFERENCES "invoice"("uuid_invoice") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_payment" ADD CONSTRAINT "e_payment_uuid_invoice_fkey" FOREIGN KEY ("uuid_invoice") REFERENCES "invoice"("uuid_invoice") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_payment" ADD CONSTRAINT "e_payment_uuid_sale_type_fkey" FOREIGN KEY ("uuid_sale_type") REFERENCES "sale_type"("uuid_sale_type") ON DELETE RESTRICT ON UPDATE CASCADE;
