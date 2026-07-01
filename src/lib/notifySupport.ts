import { prisma } from './prisma'
import {
  sendTicketOpenedEmail,
  sendTicketRepliedEmail,
  sendTicketReopenedEmail,
  type EmailResult,
} from './email'

// ─── Notify ADM when a seller opens or reopens a ticket ───────────────────────

export async function notifyAdminTicketOpened(opts: {
  merchantId:    string
  merchantName:  string
  ticketId:      string
  ticketSubject: string
  message:       string
}): Promise<void> {
  const { merchantId, merchantName, ticketId, ticketSubject, message } = opts

  // Find all admin users that have an email address
  const admins = await prisma.user.findMany({
    where:  { role: 'ADMIN' },
    select: { id: true, email: true },
  })

  const metadata = JSON.stringify({ ticketId, merchantId, merchantName })

  // Fire all side-effects in parallel; never throw
  await Promise.allSettled([
    // Seller-facing notification so they can see it on the dash too
    prisma.notification.create({
      data: {
        merchantId,
        type:  'TICKET_ABERTO',
        title: 'Ticket enviado',
        body:  `Seu ticket "${ticketSubject}" foi recebido. Responderemos em até 8h úteis.`,
        metadata,
      },
    }),
    // Email to every admin
    ...admins.map(async (admin) => {
      const result: EmailResult = await sendTicketOpenedEmail({
        to:            admin.email,
        subject:       ticketSubject,
        merchantName,
        ticketSubject,
        message,
      })
      if (result !== 'skipped') {
        await prisma.auditLog.create({
          data: {
            userId:   admin.id,
            action:   'SUPPORT_EMAIL_SENT',
            entity:   'Ticket',
            entityId: ticketId,
            metadata: JSON.stringify({ to: admin.email, result, event: 'ticket_opened' }),
          },
        }).catch(() => undefined)
      }
    }),
  ])
}

// ─── Notify seller when ADM replies ───────────────────────────────────────────

export async function notifySellerTicketReplied(opts: {
  merchantId:    string
  ticketId:      string
  ticketSubject: string
  reply:         string
}): Promise<void> {
  const { merchantId, ticketId, ticketSubject, reply } = opts

  // Get seller user and merchant name
  const ticket = await prisma.ticket.findUnique({
    where:   { id: ticketId },
    include: {
      user:     { select: { id: true, email: true, name: true } },
      merchant: { select: { name: true } },
    },
  })
  if (!ticket) return

  const merchantName = ticket.merchant.name
  const metadata     = JSON.stringify({ ticketId, merchantId })

  await Promise.allSettled([
    prisma.notification.create({
      data: {
        merchantId,
        type:  'TICKET_RESPONDIDO',
        title: 'Suporte respondeu seu ticket',
        body:  `Seu ticket "${ticketSubject}" recebeu uma resposta.`,
        metadata,
      },
    }),
    (async () => {
      const result: EmailResult = await sendTicketRepliedEmail({
        to:            ticket.user.email,
        merchantName,
        ticketSubject,
        reply,
      })
      if (result !== 'skipped') {
        await prisma.auditLog.create({
          data: {
            userId:   ticket.user.id,
            action:   'SUPPORT_EMAIL_SENT',
            entity:   'Ticket',
            entityId: ticketId,
            metadata: JSON.stringify({ to: ticket.user.email, result, event: 'ticket_replied' }),
          },
        }).catch(() => undefined)
      }
    })(),
  ])
}

// ─── Notify ADM when a seller replies (reopens) ───────────────────────────────

export async function notifyAdminTicketReopened(opts: {
  merchantId:    string
  merchantName:  string
  ticketId:      string
  ticketSubject: string
  message:       string
}): Promise<void> {
  const { merchantId, merchantName, ticketId, ticketSubject, message } = opts

  const admins = await prisma.user.findMany({
    where:  { role: 'ADMIN' },
    select: { id: true, email: true },
  })

  await Promise.allSettled([
    // Confirm to seller their reply was sent
    prisma.notification.create({
      data: {
        merchantId,
        type:  'TICKET_REABERTO',
        title: 'Resposta enviada ao suporte',
        body:  `Sua resposta no ticket "${ticketSubject}" foi registrada.`,
        metadata: JSON.stringify({ ticketId }),
      },
    }),
    ...admins.map(async (admin) => {
      const result: EmailResult = await sendTicketReopenedEmail({
        to:            admin.email,
        merchantName,
        ticketSubject,
        message,
      })
      if (result !== 'skipped') {
        await prisma.auditLog.create({
          data: {
            userId:   admin.id,
            action:   'SUPPORT_EMAIL_SENT',
            entity:   'Ticket',
            entityId: ticketId,
            metadata: JSON.stringify({ to: admin.email, result, event: 'ticket_reopened' }),
          },
        }).catch(() => undefined)
      }
    }),
  ])
}
