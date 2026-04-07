-- CreateEnum
CREATE TYPE "item_type" AS ENUM ('RESALE');

-- CreateEnum
CREATE TYPE "vat_type" AS ENUM ('VATABLE');

-- CreateEnum
CREATE TYPE "inventory_transaction_type" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "category" (
    "uuid_category" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_name" TEXT,
    "uuid_company" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "category_pkey" PRIMARY KEY ("uuid_category")
);

-- CreateTable
CREATE TABLE "product" (
    "uuid_product" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "product_image_url" VARCHAR(500),
    "barcode" VARCHAR(100),
    "base_unit" VARCHAR(50) NOT NULL DEFAULT '',
    "quantity" DECIMAL(19,4),
    "cost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "price" DECIMAL(19,4) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "item_type" "item_type" NOT NULL DEFAULT 'RESALE',
    "vat_type" "vat_type" NOT NULL DEFAULT 'VATABLE',
    "uuid_category" UUID NOT NULL,
    "uuid_company" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "product_pkey" PRIMARY KEY ("uuid_product")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "image_url" TEXT NOT NULL,
    "uuid_product" UUID NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "uuid_inventory" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quantity" DECIMAL(19,4) NOT NULL,
    "type" "inventory_transaction_type" NOT NULL,
    "reference" TEXT,
    "uuid_product" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("uuid_inventory")
);

-- CreateIndex
CREATE INDEX "category_uuid_company_idx" ON "category"("uuid_company");

-- CreateIndex
CREATE INDEX "product_uuid_category_idx" ON "product"("uuid_category");

-- CreateIndex
CREATE INDEX "product_uuid_company_idx" ON "product"("uuid_company");

-- CreateIndex
CREATE UNIQUE INDEX "product_name_uuid_category_key" ON "product"("name", "uuid_category");

-- CreateIndex
CREATE INDEX "product_images_uuid_product_idx" ON "product_images"("uuid_product");

-- CreateIndex
CREATE INDEX "inventory_uuid_product_idx" ON "inventory"("uuid_product");

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_uuid_company_fkey" FOREIGN KEY ("uuid_company") REFERENCES "company"("uuid_company") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_uuid_category_fkey" FOREIGN KEY ("uuid_category") REFERENCES "category"("uuid_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_uuid_company_fkey" FOREIGN KEY ("uuid_company") REFERENCES "company"("uuid_company") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_uuid_product_fkey" FOREIGN KEY ("uuid_product") REFERENCES "product"("uuid_product") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_uuid_product_fkey" FOREIGN KEY ("uuid_product") REFERENCES "product"("uuid_product") ON DELETE RESTRICT ON UPDATE CASCADE;
