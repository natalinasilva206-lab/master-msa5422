'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function addToCdi(amount: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!amount || amount <= 0) return { error: 'Informe um valor válido.' }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  const merchant = user?.merchant
  if (!merchant) return { error: 'Merchant não encontrado.' }

  if (amount > merchant.pendingBalance) {
    return { error: 'Valor maior do que o saldo pendente disponível.' }
  }

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      pendingBalance: { decrement: amount },
      balance:        { increment: amount },
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'ADD_TO_CDI',
      entity:   'Merchant',
      entityId: merchant.id,
      metadata: JSON.stringify({ amount, from: 'pendingBalance', to: 'balance' }),
    },
  })

  revalidatePath('/cliente/cdi')
  revalidatePath('/cliente/dashboard')
  return {}
}

export async function withdrawFromCdi(amount: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!amount || amount <= 0) return { error: 'Informe um valor válido.' }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  const merchant = user?.merchant
  if (!merchant) return { error: 'Merchant não encontrado.' }

  if (amount > merchant.balance) {
    return { error: 'Valor maior do que o saldo em CDI.' }
  }

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      balance:        { decrement: amount },
      pendingBalance: { increment: amount },
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'CDI_WITHDRAW',
      entity:   'Merchant',
      entityId: merchant.id,
      metadata: JSON.stringify({ amount, from: 'balance', to: 'pendingBalance' }),
    },
  })

  revalidatePath('/cliente/cdi')
  revalidatePath('/cliente/dashboard')
  revalidatePath('/cliente/saques')
  return {}
}
