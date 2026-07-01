-- CreateTable
CREATE TABLE "CdiCycle" (
    "id"            TEXT NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'PENDING',
    "previewData"   TEXT NOT NULL,
    "generatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,
    "approvedAt"    TIMESTAMP(3),
    "approvedById"  TEXT,
    "creditedAt"    TIMESTAMP(3),
    "creditedById"  TEXT,
    "cancelledAt"   TIMESTAMP(3),
    "cancelledById" TEXT,
    "errorMessage"  TEXT,
    "count"         INTEGER,
    "totalCredited" DOUBLE PRECISION,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CdiCycle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CdiCycle_status_idx"      ON "CdiCycle"("status");
CREATE INDEX "CdiCycle_generatedAt_idx" ON "CdiCycle"("generatedAt");
