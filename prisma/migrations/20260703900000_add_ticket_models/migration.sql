-- CreateTable: Ticket
CREATE TABLE "Ticket" (
    "id"          TEXT NOT NULL,
    "merchantId"  TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "subject"     TEXT NOT NULL,
    "category"    TEXT NOT NULL DEFAULT 'Outro',
    "status"      TEXT NOT NULL DEFAULT 'ABERTO',
    "priority"    TEXT NOT NULL DEFAULT 'MEDIA',
    "assignedTo"  TEXT,
    "slaDueAt"    TIMESTAMP(3),
    "closedAt"    TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TicketMessage
CREATE TABLE "TicketMessage" (
    "id"             TEXT NOT NULL,
    "ticketId"       TEXT NOT NULL,
    "senderId"       TEXT NOT NULL,
    "senderRole"     TEXT NOT NULL,
    "message"        TEXT NOT NULL,
    "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_merchantId_idx" ON "Ticket"("merchantId");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
