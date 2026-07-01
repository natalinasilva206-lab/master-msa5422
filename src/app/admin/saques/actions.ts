'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dispatchWebhook } from '@/lib/dispatchWebhook'

export async function resolveWithdrawal(
  requestLogId: string,
  merchantId: string,
  amount: number,
  approve: boolean,
): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'ADMIN') return { error: 'Acesso negado.' }

  const log = await prisma.auditLog.findUnique({ where: { id: requestLogId } })
  if (!log || log.action !== 'WITHDRAW_REQUEST') return { error: 'Solicitação não encontrada.' }

  let meta: Record<string, unknown> = {}
  try { meta = JSON.parse(log.metadata ?? '{}') } catch {}
  if (meta.resolved) return { error: 'Solicitação já foi processada.' }

  await prisma.auditLog.update({
    where: { id: requestLogId },
    data: { metadata: JSON.stringify({ ...meta, resolved: true, resolvedAt: new Date().toISOString(), approve }) },
  })

  if (approve) {
    await prisma.auditLog.create({
      data: {
        userId:   log.userId,
        action:   'WITHDRAW_APPROVED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({ amount, requestLogId }),
      },
    })
  } else {
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { pendingBalance: { increment: amount } },
    })
    await prisma.auditLog.create({
      data: {
        userId:   log.userId,
        action:   'WITHDRAW_DENIED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({ amount, requestLogId }),
      },
    })
  }

  dispatchWebhook(merchantId, approve ? 'withdrawal.approved' : 'withdrawal.denied', { merchantId, amount, requestLogId }).catch(() => {})

  revalidatePath('/admin/saques')
  revalidatePath('/cliente/saques')
  revalidatePath('/cliente/dashboard')
  revalidatePath('/cliente/extrato')
  return {}
}
