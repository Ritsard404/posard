CREATE TYPE "public"."business_mode" AS ENUM ('RETAIL', 'RESTAURANT', 'HYBRID');
CREATE TYPE "public"."fulfillment_type" AS ENUM ('WALK_IN', 'DINE_IN', 'TAKE_OUT', 'DELIVERY', 'PICKUP');
CREATE TYPE "public"."modifier_group_type" AS ENUM ('VARIANT', 'MODIFIER', 'ADDON', 'INSTRUCTION');

ALTER TABLE "public"."company"
  ADD COLUMN "business_mode" "public"."business_mode" NOT NULL DEFAULT 'RETAIL',
  ADD COLUMN "default_fulfillment_type" "public"."fulfillment_type" NOT NULL DEFAULT 'WALK_IN',
  ADD COLUMN "enable_fulfillment_types" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_table_service" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_delivery_details" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_product_modifiers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_kitchen_tickets" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."pos_terminal_info"
  ADD COLUMN "business_mode_override" "public"."business_mode",
  ADD COLUMN "enable_fulfillment_types" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_restaurant_features" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_table_service" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_delivery_details" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_product_modifiers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enable_kitchen_tickets" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."product"
  ADD COLUMN "is_configurable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "configuration_mode" "public"."business_mode";

CREATE TABLE "public"."modifier_group" (
  "uuid_modifier_group" UUID NOT NULL DEFAULT gen_random_uuid(),
  "company_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "type" "public"."modifier_group_type" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "min_select" INTEGER NOT NULL DEFAULT 0,
  "max_select" INTEGER NOT NULL DEFAULT 1,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "modifier_group_pkey" PRIMARY KEY ("uuid_modifier_group"),
  CONSTRAINT "modifier_group_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."modifier_option" (
  "uuid_modifier_option" UUID NOT NULL DEFAULT gen_random_uuid(),
  "modifier_group_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "price_delta" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "modifier_option_pkey" PRIMARY KEY ("uuid_modifier_option"),
  CONSTRAINT "modifier_option_modifier_group_id_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."modifier_group"("uuid_modifier_group") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "public"."product_modifier_group" (
  "uuid_product_modifier_group" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "modifier_group_id" UUID NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "product_modifier_group_pkey" PRIMARY KEY ("uuid_product_modifier_group"),
  CONSTRAINT "product_modifier_group_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("uuid_product") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_modifier_group_modifier_group_id_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."modifier_group"("uuid_modifier_group") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uk_product_modifier_group" ON "public"."product_modifier_group"("product_id", "modifier_group_id");
CREATE INDEX "modifier_group_company_id_is_active_idx" ON "public"."modifier_group"("company_id", "is_active");
CREATE INDEX "modifier_option_modifier_group_id_is_active_idx" ON "public"."modifier_option"("modifier_group_id", "is_active");
CREATE INDEX "product_modifier_group_product_id_idx" ON "public"."product_modifier_group"("product_id");
CREATE INDEX "product_modifier_group_modifier_group_id_idx" ON "public"."product_modifier_group"("modifier_group_id");

ALTER TABLE "public"."invoice"
  ADD COLUMN "fulfillment_type" "public"."fulfillment_type" NOT NULL DEFAULT 'WALK_IN',
  ADD COLUMN "table_number" TEXT,
  ADD COLUMN "guest_count" INTEGER,
  ADD COLUMN "delivery_customer_name" TEXT,
  ADD COLUMN "delivery_address" TEXT,
  ADD COLUMN "delivery_reference" TEXT,
  ADD COLUMN "delivery_fee" DECIMAL(15,2);

ALTER TABLE "public"."item"
  ADD COLUMN "base_price" DECIMAL(19,4),
  ADD COLUMN "special_instructions" TEXT,
  ADD COLUMN "configuration_snapshot" JSONB;

CREATE TABLE "public"."order_item_selection" (
  "uuid_order_item_selection" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_item_id" UUID NOT NULL,
  "modifier_group_name" TEXT NOT NULL,
  "modifier_group_type" "public"."modifier_group_type" NOT NULL,
  "option_name" TEXT,
  "price_delta" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "order_item_selection_pkey" PRIMARY KEY ("uuid_order_item_selection"),
  CONSTRAINT "order_item_selection_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."item"("uuid_item") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "order_item_selection_order_item_id_idx" ON "public"."order_item_selection"("order_item_id");
