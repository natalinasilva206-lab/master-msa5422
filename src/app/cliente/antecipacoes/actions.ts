'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TAXA_ANTECIPACAO = 2.5 // percentual cobrado sobre o valor antecipado

export async function requestAntecipacao(amount: number): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!amount || amount <= 0) return { error: 'Informe um valor válido.' }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  const merchant = user?.merchant
  if (!merchant) return { error: 'Merchant não encontrado.' }
  if (merchant.status !== 'ACTIVE') return { error: 'Sua conta precisa estar ativa para solicitar antecipações.' }
  if (amount > merchant.pendingBalance) return { error: 'Valor maior que o saldo pendente disponível.' }

  const taxa    = amount * (TAXA_ANTECIPACAO / 100)
  const liquido = amount - taxa

  // Move o valor do pendingBalance para balance (já descontando a taxa)
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      pendingBalance: { decrement: amount },
      balance:        { increment: liquido },
    },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'ANTECIPACAO_REQUEST',
      entity:   'Merchant',
      entityId: merchant.id,
      metadata: JSON.stringify({ amount, taxa, liquido, taxaPercent: TAXA_ANTECIPACAO }),
    },
  })

  revalidatePath('/cliente/antecipacoes')
  revalidatePath('/cliente/dashboard')
  revalidatePath('/cliente/extrato')
  revalidatePath('/cliente/saques')
  return {}
}
