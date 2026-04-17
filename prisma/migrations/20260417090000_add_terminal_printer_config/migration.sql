CREATE TYPE "public"."printer_connection_type" AS ENUM ('usb', 'bluetooth');

ALTER TABLE "public"."pos_terminal_info"
ADD COLUMN "printer_display_name" TEXT,
ADD COLUMN "printer_connection_type" "public"."printer_connection_type",
ADD COLUMN "printer_vendor_id" INTEGER,
ADD COLUMN "printer_product_id" INTEGER,
ADD COLUMN "printer_device_id" TEXT,
ADD COLUMN "printer_service_uuid" TEXT,
ADD COLUMN "printer_characteristic_uuid" TEXT,
ADD COLUMN "auto_print_enabled" BOOLEAN NOT NULL DEFAULT true;
