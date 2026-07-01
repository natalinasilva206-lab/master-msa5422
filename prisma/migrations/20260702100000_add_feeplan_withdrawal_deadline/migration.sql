ALTER TABLE "FeePlan" ADD COLUMN IF NOT EXISTS "withdrawalDeadline" TEXT NOT NULL DEFAULT '1 dia útil';
