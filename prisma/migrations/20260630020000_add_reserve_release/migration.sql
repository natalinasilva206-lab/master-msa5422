CREATE TABLE "ReserveRelease" (
    "id"             TEXT NOT NULL,
    "merchantId"     TEXT NOT NULL,
    "saleLogId"      TEXT NOT NULL,
    "amount"         DOUBLE PRECISION NOT NULL,
    "saleAmount"     DOUBLE PRECISION NOT NULL,
    "reservePercent" DOUBLE PRECISION NOT NULL,
    "releaseDays"    INTEGER NOT NULL,
    "saleDate"       TIMESTAMP(3) NOT NULL,
    "releaseAt"      TIMESTAMP(3) NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'RESERVADO',
    "releasedAt"     TIMESTAMP(3),
    "releasedBy"     TEXT,
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReserveRelease_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ReserveRelease" ADD CONSTRAINT "ReserveRelease_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ReserveRelease_merchantId_idx" ON "ReserveRelease"("merchantId");
CREATE INDEX "ReserveRelease_releaseAt_status_idx" ON "ReserveRelease"("releaseAt", "status");
