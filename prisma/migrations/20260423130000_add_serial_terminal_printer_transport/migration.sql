ALTER TYPE "public"."printer_connection_type"
ADD VALUE IF NOT EXISTS 'serial';

ALTER TYPE "public"."printer_connection_type"
ADD VALUE IF NOT EXISTS 'built_in';

DO $$
BEGIN
  CREATE TYPE "public"."printer_transport" AS ENUM ('usb', 'bluetooth', 'built_in');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "public"."printer_driver" AS ENUM ('webusb', 'webbluetooth', 'webserial', 'sunmi_native');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."pos_terminal_info"
ADD COLUMN IF NOT EXISTS "printer_transport" "public"."printer_transport",
ADD COLUMN IF NOT EXISTS "printer_driver" "public"."printer_driver";
