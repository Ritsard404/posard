-- AlterEnum
ALTER TYPE "inventory_transaction_type" ADD VALUE 'ADJUSTMENT';

-- AlterEnum
ALTER TYPE "item_type" ADD VALUE 'WHOLESALE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "vat_type" ADD VALUE 'EXEMPT';
ALTER TYPE "vat_type" ADD VALUE 'ZERO';
