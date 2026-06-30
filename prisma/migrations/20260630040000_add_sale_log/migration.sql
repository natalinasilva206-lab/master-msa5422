CREATE TABLE "SaleLog" (
    "id"          TEXT                     NOT NULL,
    "merchantId"  TEXT                     NOT NULL,
    "amount"      DOUBLE PRECISION         NOT NULL,
    "type"        TEXT                     NOT NULL,
    "status"      TEXT                     NOT NULL DEFAULT 'APROVADO',
    "description" TEXT,
    "externalId"  TEXT,
    "disputeId"   TEXT,
    "createdAt"   TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SaleLog" ADD CONSTRAINT "SaleLog_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "SaleLog_merchantId_idx" ON "SaleLog"("merchantId");
CREATE INDEX "SaleLog_type_idx"       ON "SaleLog"("type");
CREATE INDEX "SaleLog_createdAt_idx"  ON "SaleLog"("createdAt" DESC);
