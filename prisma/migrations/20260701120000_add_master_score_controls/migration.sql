-- Campos de controle manual do ADM no MasterScore
ALTER TABLE "MasterScore"
  ADD COLUMN IF NOT EXISTS "monitorado"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "estrategico"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "beneficioCongelado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "nivelManual"        TEXT,
  ADD COLUMN IF NOT EXISTS "sugestaoStatus"     TEXT NOT NULL DEFAULT 'pendente';

-- Tabela de auditoria das ações manuais do ADM no Master Score
CREATE TABLE IF NOT EXISTS "MasterScoreAudit" (
  "id"          TEXT NOT NULL,
  "merchantId"  TEXT NOT NULL,
  "adminEmail"  TEXT NOT NULL,
  "adminName"   TEXT NOT NULL,
  "acao"        TEXT NOT NULL,
  "valorAntes"  TEXT,
  "valorDepois" TEXT,
  "motivo"      TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterScoreAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MasterScoreAudit_merchantId_idx" ON "MasterScoreAudit"("merchantId");
CREATE INDEX IF NOT EXISTS "MasterScoreAudit_createdAt_idx"  ON "MasterScoreAudit"("createdAt");

ALTER TABLE "MasterScoreAudit"
  ADD CONSTRAINT "MasterScoreAudit_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "MasterScore"("merchantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
