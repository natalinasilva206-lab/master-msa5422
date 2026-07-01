-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- Seed default: simulation enabled
INSERT INTO "SystemConfig" ("key", "value") VALUES ('ir_iof_simulation_enabled', 'true') ON CONFLICT DO NOTHING;
