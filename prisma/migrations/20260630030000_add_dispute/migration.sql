CREATE TABLE "Dispute" (
    "id"               TEXT NOT NULL,
    "type"             TEXT NOT NULL,
    "merchantId"       TEXT NOT NULL,
    "saleLogId"        TEXT,
    "contestedAmount"  DOUBLE PRECISION NOT NULL,
    "blockedAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"           TEXT NOT NULL DEFAULT 'ABERTO',
    "openedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline"         TIMESTAMP(3),
    "assignedTo"       TEXT,
    "documents"        TEXT,
    "notes"            TEXT,
    "resolvedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Dispute_merchantId_idx"   ON "Dispute"("merchantId");
CREATE INDEX "Dispute_status_idx"       ON "Dispute"("status");
CREATE INDEX "Dispute_openedAt_idx"     ON "Dispute"("openedAt" DESC);
