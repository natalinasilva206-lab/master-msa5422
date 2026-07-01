-- AlterTable: Add metadata column to SaleLog for tracking operation source
ALTER TABLE "SaleLog" ADD COLUMN IF NOT EXISTS "metadata" TEXT;
