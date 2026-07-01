'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function sendSupportTicket(subject: string, message: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!subject?.trim()) return { error: 'Informe o assunto.' }
  if (!message?.trim() || message.trim().length < 10) return { error: 'Mensagem muito curta (mínimo 10 caracteres).' }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  const merchant = user?.merchant

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'SUPPORT_TICKET',
      entity:   'Merchant',
      entityId: merchant?.id ?? userId,
      metadata: JSON.stringify({
        subject:  subject.trim(),
        message:  message.trim(),
        sellerName: user?.name ?? user?.email ?? '—',
        sellerEmail: user?.email ?? '—',
        plano: merchant?.plan ?? '—',
      }),
    },
  })

  revalidatePath('/cliente/suporte')
  revalidatePath('/admin/suporte')
  return { ok: true }
}
