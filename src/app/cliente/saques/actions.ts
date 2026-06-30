'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function requestWithdrawal(amount: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!amount || amount <= 0) return { error: 'Informe um valor válido.' }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  const merchant = user?.merchant
  if (!merchant) return { error: 'Merchant não encontrado.' }
  if (merchant.status !== 'ACTIVE') return { error: 'Sua conta precisa estar ativa para solicitar saques.' }
  if (amount > merchant.pendingBalance) return { error: 'Valor maior que o saldo disponível.' }

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { pendingBalance: { decrement: amount } },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'WITHDRAW_REQUEST',
      entity:   'Merchant',
      entityId: merchant.id,
      metadata: JSON.stringify({ amount, status: 'PENDING' }),
    },
  })

  revalidatePath('/cliente/saques')
  revalidatePath('/cliente/dashboard')
  revalidatePath('/cliente/extrato')
  return {}
}
