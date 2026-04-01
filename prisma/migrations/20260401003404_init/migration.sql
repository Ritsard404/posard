/*
  Warnings:

  - You are about to drop the column `approved` on the `company` table. All the data in the column will be lost.
  - You are about to drop the column `uuid_company` on the `company_images` table. All the data in the column will be lost.
  - You are about to drop the column `uuid_cashier` on the `timestamp` table. All the data in the column will be lost.
  - You are about to drop the column `uuid_manager_in` on the `timestamp` table. All the data in the column will be lost.
  - You are about to drop the column `uuid_manager_out` on the `timestamp` table. All the data in the column will be lost.
  - You are about to drop the column `uuid_pos_terminal` on the `timestamp` table. All the data in the column will be lost.
  - You are about to drop the `member` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `company_id` to the `company_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cashier_id` to the `timestamp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pos_terminal_id` to the `timestamp` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "company_images" DROP CONSTRAINT "company_images_uuid_company_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_uuid_company_fkey";

-- DropForeignKey
ALTER TABLE "pos_terminal_info" DROP CONSTRAINT "pos_terminal_info_company_id_fkey";

-- DropForeignKey
ALTER TABLE "timestamp" DROP CONSTRAINT "timestamp_uuid_cashier_fkey";

-- DropForeignKey
ALTER TABLE "timestamp" DROP CONSTRAINT "timestamp_uuid_manager_in_fkey";

-- DropForeignKey
ALTER TABLE "timestamp" DROP CONSTRAINT "timestamp_uuid_manager_out_fkey";

-- DropForeignKey
ALTER TABLE "timestamp" DROP CONSTRAINT "timestamp_uuid_pos_terminal_fkey";

-- AlterTable
ALTER TABLE "company" DROP COLUMN "approved",
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "company_images" DROP COLUMN "uuid_company",
ADD COLUMN     "company_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "timestamp" DROP COLUMN "uuid_cashier",
DROP COLUMN "uuid_manager_in",
DROP COLUMN "uuid_manager_out",
DROP COLUMN "uuid_pos_terminal",
ADD COLUMN     "cashier_id" UUID NOT NULL,
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "manager_in_id" UUID,
ADD COLUMN     "manager_out_id" UUID,
ADD COLUMN     "pos_terminal_id" UUID NOT NULL;

-- DropTable
DROP TABLE "member";

-- DropEnum
DROP TYPE "member_approval_status";

-- DropEnum
DROP TYPE "permission_type";

-- CreateIndex
CREATE INDEX "company_images_company_id_idx" ON "company_images"("company_id");

-- CreateIndex
CREATE INDEX "pos_terminal_info_company_id_idx" ON "pos_terminal_info"("company_id");

-- CreateIndex
CREATE INDEX "profiles_company_id_idx" ON "profiles"("company_id");

-- CreateIndex
CREATE INDEX "timestamp_pos_terminal_id_idx" ON "timestamp"("pos_terminal_id");

-- CreateIndex
CREATE INDEX "timestamp_cashier_id_idx" ON "timestamp"("cashier_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("uuid_company") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_images" ADD CONSTRAINT "company_images_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_terminal_info" ADD CONSTRAINT "pos_terminal_info_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("uuid_company") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_pos_terminal_id_fkey" FOREIGN KEY ("pos_terminal_id") REFERENCES "pos_terminal_info"("uuid_pos_terminal") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_manager_in_id_fkey" FOREIGN KEY ("manager_in_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timestamp" ADD CONSTRAINT "timestamp_manager_out_id_fkey" FOREIGN KEY ("manager_out_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
