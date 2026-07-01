-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id"         TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "event"      TEXT NOT NULL,
    "url"        TEXT NOT NULL,
    "payload"    TEXT NOT NULL,
    "statusCode" INTEGER,
    "response"   TEXT,
    "error"      TEXT,
    "attempt"    INTEGER NOT NULL DEFAULT 1,
    "success"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookDelivery_merchantId_idx"  ON "WebhookDelivery"("merchantId");
CREATE INDEX "WebhookDelivery_endpointId_idx"  ON "WebhookDelivery"("endpointId");
CREATE INDEX "WebhookDelivery_event_idx"        ON "WebhookDelivery"("event");
CREATE INDEX "WebhookDelivery_success_idx"      ON "WebhookDelivery"("success");
CREATE INDEX "WebhookDelivery_createdAt_idx"    ON "WebhookDelivery"("createdAt");
