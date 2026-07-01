'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const taxaPlano: Record<string, number> = { Start: 2.5, Growth: 2.0, Prime: 1.5, Black: 1.0 }
const TAXA_DEFAULT = 2.5

export async function requestAntecipacao(amount: number, notes?: string): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  if (!amount || amount < 10) return { error: 'Valor mínimo de R$ 10,00.' }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  const merchant = user?.merchant
  if (!merchant) return { error: 'Merchant não encontrado.' }
  if (merchant.status !== 'ACTIVE') return { error: 'Sua conta precisa estar ativa para solicitar antecipações.' }

  // Card receivables = futureBalance (not pendingBalance)
  if (amount > merchant.futureBalance) return { error: 'Valor maior que os recebíveis de cartão disponíveis para antecipação.' }

  // Check if there's already a pending request
  const existing = await prisma.anticipation.findFirst({
    where: { merchantId: merchant.id, status: 'PENDENTE' },
  })
  if (existing) return { error: 'Você já possui uma solicitação de antecipação em análise. Aguarde a resposta do administrador.' }

  const feePercent = taxaPlano[merchant.plan] ?? TAXA_DEFAULT
  const feeAmount  = Math.round(amount * (feePercent / 100) * 100) / 100
  const netAmount  = Math.round((amount - feeAmount) * 100) / 100

  await prisma.anticipation.create({
    data: {
      merchantId: merchant.id,
      requestedAmount: amount,
      feePercent,
      feeAmount,
      netAmount,
      status: 'PENDENTE',
      notes: notes?.trim() || null,
    },
  })

  revalidatePath('/cliente/antecipacoes')
  return {}
}

export async function cancelAntecipacao(id: string): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return { error: 'Sessão inválida.' }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: { select: { id: true } } } })
  const merchantId = user?.merchant?.id
  if (!merchantId) return { error: 'Merchant não encontrado.' }

  const ant = await prisma.anticipation.findFirst({
    where: { id, merchantId, status: 'PENDENTE' },
  })
  if (!ant) return { error: 'Solicitação não encontrada ou já processada.' }

  await prisma.anticipation.update({
    where: { id },
    data: { status: 'CANCELADA', resolvedAt: new Date() },
  })

  revalidatePath('/cliente/antecipacoes')
  return {}
}
