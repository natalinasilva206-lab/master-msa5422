'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { notifySellerTicketReplied } from '@/lib/notifySupport'
import { calcSlaDueAt } from '@/lib/sla'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') throw new Error('Acesso negado.')
  return session!.user as any
}

export async function replyTicket(
  ticketId: string,
  reply: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin()
  if (!reply?.trim()) return { error: 'A resposta não pode estar vazia.' }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket não encontrado.' }

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId:   admin.id,
        senderRole: 'ADMIN',
        message:    reply.trim(),
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status:    'RESPONDIDO',
        updatedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'SUPPORT_TICKET_REPLIED',
        entity:   'Ticket',
        entityId: ticketId,
        metadata: JSON.stringify({
          ticketId,
          adminName:  admin.name,
          adminEmail: admin.email,
          reply:      reply.trim(),
          repliedAt:  new Date().toISOString(),
        }),
      },
    }),
  ])

  revalidatePath('/admin/suporte')
  revalidatePath('/cliente/suporte')

  // Notify seller — fire-and-forget
  notifySellerTicketReplied({
    merchantId:    ticket.merchantId,
    ticketId,
    ticketSubject: ticket.subject,
    reply:         reply.trim(),
  }).catch(() => undefined)

  return { ok: true }
}

export async function updateTicketStatus(
  ticketId: string,
  status: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin()

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { error: 'Ticket não encontrado.' }

  const validStatuses = ['ABERTO', 'EM_ANALISE', 'AGUARDANDO_CLIENTE', 'RESPONDIDO', 'FECHADO', 'REABERTO']
  if (!validStatuses.includes(status)) return { error: 'Status inválido.' }

  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        closedAt:  status === 'FECHADO' ? new Date() : undefined,
        updatedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'TICKET_STATUS_CHANGED',
        entity:   'Ticket',
        entityId: ticketId,
        metadata: JSON.stringify({
          before: ticket.status,
          after:  status,
          adminName: admin.name,
        }),
      },
    }),
  ])

  revalidatePath('/admin/suporte')
  return { ok: true }
}

export async function updateTicketPriority(
  ticketId: string,
  priority: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin()

  const validPriorities = ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']
  if (!validPriorities.includes(priority)) return { error: 'Prioridade inválida.' }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })

  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: {
        priority,
        // Recalculate SLA from now when priority changes (unless already closed)
        slaDueAt: ticket?.status !== 'FECHADO' ? calcSlaDueAt(priority) : undefined,
        updatedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'TICKET_PRIORITY_CHANGED',
        entity:   'Ticket',
        entityId: ticketId,
        metadata: JSON.stringify({
          before: ticket?.priority,
          after:  priority,
          adminName: admin.name,
        }),
      },
    }),
  ])

  revalidatePath('/admin/suporte')
  return { ok: true }
}

export async function assumeTicket(
  ticketId: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin()

  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data:  { assignedTo: admin.id, status: 'EM_ANALISE', updatedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'TICKET_ASSUMED',
        entity:   'Ticket',
        entityId: ticketId,
        metadata: JSON.stringify({ adminId: admin.id, adminName: admin.name }),
      },
    }),
  ])

  revalidatePath('/admin/suporte')
  return { ok: true }
}

export async function assignTicket(
  ticketId: string,
  assignedTo: string | null,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin()

  await prisma.$transaction([
    prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedTo, status: assignedTo ? 'EM_ANALISE' : 'ABERTO', updatedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'TICKET_ASSIGNED',
        entity:   'Ticket',
        entityId: ticketId,
        metadata: JSON.stringify({ assignedTo, adminName: admin.name }),
      },
    }),
  ])

  revalidatePath('/admin/suporte')
  return { ok: true }
}

export async function addInternalNote(
  ticketId: string,
  note: string,
): Promise<{ error?: string; ok?: boolean }> {
  const admin = await requireAdmin()
  if (!note?.trim()) return { error: 'Nota não pode estar vazia.' }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId:       admin.id,
      senderRole:     'ADMIN',
      message:        note.trim(),
      isInternalNote: true,
    },
  })

  revalidatePath('/admin/suporte')
  return { ok: true }
}
