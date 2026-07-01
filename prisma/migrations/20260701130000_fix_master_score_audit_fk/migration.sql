-- Corrige FK do MasterScoreAudit: era MasterScore(merchantId), agora é Merchant(id).
-- Isso permite ações manuais do ADM mesmo antes de o score ser calculado.

ALTER TABLE "MasterScoreAudit"
  DROP CONSTRAINT IF EXISTS "MasterScoreAudit_merchantId_fkey";

ALTER TABLE "MasterScoreAudit"
  ADD CONSTRAINT "MasterScoreAudit_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
