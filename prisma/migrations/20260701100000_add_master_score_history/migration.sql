CREATE TABLE IF NOT EXISTS "MasterScoreHistory" (
  "id"               TEXT NOT NULL,
  "merchantId"       TEXT NOT NULL,
  "scoreBefore"      DOUBLE PRECISION NOT NULL,
  "scoreAfter"       DOUBLE PRECISION NOT NULL,
  "nivelBefore"      TEXT NOT NULL,
  "nivelAfter"       TEXT NOT NULL,
  "statusBefore"     TEXT NOT NULL,
  "statusAfter"      TEXT NOT NULL,
  "volumeScore"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "chargebackScore"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "medScore"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reembolsoScore"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "saldoScore"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "crescimentoScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tempoContaScore"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "margemScore"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "motivosAlteracao" TEXT NOT NULL DEFAULT '[]',
  "triggerMotivo"    TEXT NOT NULL DEFAULT 'recalculo_manual',
  "observacao"       TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterScoreHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MasterScoreHistory_merchantId_idx" ON "MasterScoreHistory"("merchantId");
CREATE INDEX IF NOT EXISTS "MasterScoreHistory_createdAt_idx"  ON "MasterScoreHistory"("createdAt");

ALTER TABLE "MasterScoreHistory"
  ADD CONSTRAINT "MasterScoreHistory_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "MasterScore"("merchantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
