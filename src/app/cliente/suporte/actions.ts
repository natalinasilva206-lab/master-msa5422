'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAdminTicketOpened, notifyAdminTicketReopened } from '@/lib/notifySupport'
import { calcSlaDueAt } from '@/lib/sla'

export async function sendSupportTicket(
  subject: string,
  message: string,
  category?: string,
): Promise<{ error?: string; ok?: boolean; ticketId?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!subject?.trim()) return { error: 'Informe o assunto.' }
  if (!message?.trim() || message.trim().length < 10)
    return { error: 'Mensagem muito curta (mínimo 10 caracteres).' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { merchant: true },
  })
  if (!user?.merchant) return { error: 'Merchant não encontrado.' }

  const slaDueAt = calcSlaDueAt('MEDIA')

  const ticket = await prisma.ticket.create({
    data: {
      merchantId: user.merchant.id,
      userId,
      subject:    subject.trim(),
      category:   (category ?? subject).trim(),
      status:     'ABERTO',
      priority:   'MEDIA',
      slaDueAt,
      messages: {
        create: {
          senderId:   userId,
          senderRole: 'SELLER',
          message:    message.trim(),
        },
      },
    },
  })

  revalidatePath('/cliente/suporte')
  revalidatePath('/admin/suporte')

  // Fire-and-forget — never blocks ticket creation
  notifyAdminTicketOpened({
    merchantId:    user.merchant.id,
    merchantName:  user.merchant.name,
    ticketId:      ticket.id,
    ticketSubject: subject.trim(),
    message:       message.trim(),
  }).catch(() => undefined)

  return { ok: true, ticketId: ticket.id }
}

export async function replyToTicket(
  ticketId: string,
  message: string,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!message?.trim() || message.trim().length < 2)
    return { error: 'Mensagem muito curta.' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { merchantId: true },
  })

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, merchantId: user?.merchantId ?? '' },
  })
  if (!ticket) return { error: 'Ticket não encontrado.' }

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId:   userId,
        senderRole: 'SELLER',
        message:    message.trim(),
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data:  { status: 'REABERTO', updatedAt: new Date() },
    }),
  ])

  revalidatePath('/cliente/suporte')
  revalidatePath('/admin/suporte')

  // Notify admin of seller reply — fire-and-forget
  const fullTicket = await prisma.ticket.findUnique({
    where:   { id: ticketId },
    include: { merchant: { select: { name: true } } },
  })
  if (fullTicket) {
    notifyAdminTicketReopened({
      merchantId:    fullTicket.merchantId,
      merchantName:  fullTicket.merchant.name,
      ticketId,
      ticketSubject: fullTicket.subject,
      message:       message.trim(),
    }).catch(() => undefined)
  }

  return { ok: true }
}
