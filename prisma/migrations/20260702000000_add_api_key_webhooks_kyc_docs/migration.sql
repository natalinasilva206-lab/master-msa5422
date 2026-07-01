-- Adiciona apiKey única por merchant (para autenticação da API REST)
ALTER TABLE "Merchant"
  ADD COLUMN IF NOT EXISTS "apiKey" TEXT,
  ADD COLUMN IF NOT EXISTS "kycDocumentUrls" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Merchant_apiKey_key" ON "Merchant"("apiKey");

-- Tabela de endpoints de webhook por merchant
CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
  "id"         TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "url"        TEXT NOT NULL,
  "events"     TEXT NOT NULL DEFAULT '[]',
  "secret"     TEXT NOT NULL,
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebhookEndpoint_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WebhookEndpoint_merchantId_idx" ON "WebhookEndpoint"("merchantId");
