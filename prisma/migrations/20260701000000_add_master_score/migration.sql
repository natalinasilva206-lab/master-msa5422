CREATE TABLE IF NOT EXISTS "MasterScore" (
  "id"                    TEXT        NOT NULL,
  "merchantId"            TEXT        NOT NULL,
  "scoreTotal"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "nivelScore"            TEXT        NOT NULL DEFAULT 'Bronze',
  "statusRisco"           TEXT        NOT NULL DEFAULT 'Alto risco',
  "volumeScore"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "chargebackScore"       DOUBLE PRECISION NOT NULL DEFAULT 100,
  "medScore"              DOUBLE PRECISION NOT NULL DEFAULT 100,
  "reembolsoScore"        DOUBLE PRECISION NOT NULL DEFAULT 100,
  "saldoScore"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "crescimentoScore"      DOUBLE PRECISION NOT NULL DEFAULT 50,
  "tempoContaScore"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "margemScore"           DOUBLE PRECISION NOT NULL DEFAULT 50,
  "dataUltimaAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "observacaoInterna"     TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MasterScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MasterScore_merchantId_key" ON "MasterScore"("merchantId");

ALTER TABLE "MasterScore"
  ADD CONSTRAINT "MasterScore_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
