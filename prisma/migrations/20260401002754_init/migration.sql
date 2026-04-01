-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'manager', 'cashier');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('pending', 'active', 'disabled');

-- CreateEnum
CREATE TYPE "member_approval_status" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "permission_type" AS ENUM ('SUPERADMIN', 'ADMIN', 'CASHIER', 'USER');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'manager',
    "status" "user_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "uuid_company" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logo_img_url" VARCHAR(500),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("uuid_company")
);

-- CreateTable
CREATE TABLE "company_images" (
    "id" SERIAL NOT NULL,
    "uuid_company" UUID NOT NULL,
    "image_url" TEXT NOT NULL,

    CONSTRAINT "company_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "uuid_member" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "member_is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "member_deleted_at" TIMESTAMPTZ,
    "approval_status" "member_approval_status" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "approved_by" UUID,
    "uuid_company" UUID,

    CONSTRAINT "member_pkey" PRIMARY KEY ("uuid_member")
);

-- CreateTable
CREATE TABLE "pos_terminal_info" (
    "uuid_pos_terminal" UUID NOT NULL DEFAULT gen_random_uuid(),
    "min_number" TEXT NOT NULL,
    "accreditation_number" TEXT NOT NULL,
    "ptu_number" TEXT NOT NULL,
    "date_issued" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "pos_name" TEXT NOT NULL,
    "registered_name" TEXT NOT NULL,
    "operated_by" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "vat_tin_number" TEXT NOT NULL,
    "vat" INTEGER NOT NULL,
    "discount_max" DECIMAL(10,2) NOT NULL,
    "cost_center" TEXT NOT NULL,
    "branch_center" TEXT NOT NULL,
    "use_center" TEXT NOT NULL,
    "db_name" TEXT,
    "printer_name" TEXT NOT NULL,
    "reset_counter_no" INTEGER NOT NULL DEFAULT 0,
    "reset_counter_train_no" INTEGER NOT NULL DEFAULT 0,
    "z_counter_no" INTEGER NOT NULL DEFAULT 0,
    "z_counter_train_no" INTEGER NOT NULL DEFAULT 0,
    "is_train_mode" BOOLEAN NOT NULL DEFAULT false,
    "is_retail_type" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "company_id" UUID NOT NULL,

    CONSTRAINT "pos_terminal_info_pkey" PRIMARY KEY ("uuid_pos_terminal")
);

-- CreateTable
CREATE TABLE "timestamp" (
    "uuid_timestamp" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp_in" TIMESTAMPTZ,
    "timestamp_out" TIMESTAMPTZ,
    "cash_in_drawer_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cash_out_drawer_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "withdrawn_drawer_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "withdrawn_drawer_count" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "uuid_pos_terminal" UUID NOT NULL,
    "uuid_cashier" UUID NOT NULL,
    "uuid_manager_in" UUID,
    "uuid_manager_out" UUID,

    CONSTRAINT "timestamp_pkey" PRIMARY KEY ("uuid_timestamp")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "member_username_key" ON "member"("username");

-- AddForeignKey
ALTER TABLE "company_images" ADD CONSTRAINT "company_images_uuid_company_fkey" FOREIGN KEY ("uuid_company") REFERENCES "company"("uuid_company") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "member"("uuid_member") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_uuid_company_fkey" FOREIGN KEY ("uuid_company") REFERENCES "company"("uuid_company") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_terminal_info" ADD CONSTRAINT "pos_terminal_info_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("uuid_company") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_uuid_pos_terminal_fkey" FOREIGN KEY ("uuid_pos_terminal") REFERENCES "pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_uuid_cashier_fkey" FOREIGN KEY ("uuid_cashier") REFERENCES "member"("uuid_member") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_uuid_manager_in_fkey" FOREIGN KEY ("uuid_manager_in") REFERENCES "member"("uuid_member") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_uuid_manager_out_fkey" FOREIGN KEY ("uuid_manager_out") REFERENCES "member"("uuid_member") ON DELETE SET NULL ON UPDATE CASCADE;
