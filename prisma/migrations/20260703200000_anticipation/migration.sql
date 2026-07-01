ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "anticipationFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 2.5;

CREATE TABLE IF NOT EXISTS "Anticipation" (
  "id"              TEXT NOT NULL,
  "merchantId"      TEXT NOT NULL,
  "requestedAmount" DOUBLE PRECISION NOT NULL,
  "feePercent"      DOUBLE PRECISION NOT NULL,
  "feeAmount"       DOUBLE PRECISION NOT NULL,
  "netAmount"       DOUBLE PRECISION NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'PENDENTE',
  "notes"           TEXT,
  "adminNotes"      TEXT,
  "resolvedBy"      TEXT,
  "resolvedAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Anticipation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Anticipation_merchantId_idx" ON "Anticipation"("merchantId");
CREATE INDEX IF NOT EXISTS "Anticipation_status_idx" ON "Anticipation"("status");

ALTER TABLE "Anticipation" DROP CONSTRAINT IF EXISTS "Anticipation_merchantId_fkey";
ALTER TABLE "Anticipation" ADD CONSTRAINT "Anticipation_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
