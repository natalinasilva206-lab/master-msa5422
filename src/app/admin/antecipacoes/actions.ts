'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login')
  return session
}

export async function approveAntecipacao(id: string, adminNotes?: string) {
  const session = await requireAdmin()
  const admin = session.user as any

  const ant = await prisma.anticipation.findUnique({
    where: { id },
    include: { merchant: true },
  })
  if (!ant || ant.status !== 'PENDENTE') return { error: 'Solicitação não encontrada ou já processada.' }

  if (ant.merchant.futureBalance < ant.requestedAmount) {
    return { error: 'Recebíveis insuficientes para cobrir o valor solicitado.' }
  }

  await prisma.$transaction([
    prisma.anticipation.update({
      where: { id },
      data: {
        status: 'APROVADA',
        adminNotes: adminNotes || null,
        resolvedBy: admin.id,
        resolvedAt: new Date(),
      },
    }),
    prisma.merchant.update({
      where: { id: ant.merchantId },
      data: {
        futureBalance: { decrement: ant.requestedAmount },
        pendingBalance: { increment: ant.netAmount },
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'ANTICIPATION_APPROVED',
        entity: 'Anticipation',
        entityId: id,
        metadata: JSON.stringify({
          merchantId: ant.merchantId,
          requestedAmount: ant.requestedAmount,
          feePercent: ant.feePercent,
          feeAmount: ant.feeAmount,
          netAmount: ant.netAmount,
          adminNotes: adminNotes ?? null,
        }),
      },
    }),
  ])

  revalidatePath('/admin/antecipacoes')
  revalidatePath(`/admin/clientes/${ant.merchantId}`)
  return { ok: true }
}

export async function rejectAntecipacao(id: string, adminNotes?: string) {
  const session = await requireAdmin()
  const admin = session.user as any

  const ant = await prisma.anticipation.findUnique({ where: { id } })
  if (!ant || ant.status !== 'PENDENTE') return { error: 'Solicitação não encontrada ou já processada.' }

  await prisma.$transaction([
    prisma.anticipation.update({
      where: { id },
      data: {
        status: 'REJEITADA',
        adminNotes: adminNotes || null,
        resolvedBy: admin.id,
        resolvedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'ANTICIPATION_REJECTED',
        entity: 'Anticipation',
        entityId: id,
        metadata: JSON.stringify({ merchantId: ant.merchantId, adminNotes: adminNotes ?? null }),
      },
    }),
  ])

  revalidatePath('/admin/antecipacoes')
  revalidatePath(`/admin/clientes/${ant.merchantId}`)
  return { ok: true }
}

export async function updateAnticipationFee(merchantId: string, feePercent: number) {
  await requireAdmin()
  const fee = Math.max(0, Math.min(20, parseFloat(String(feePercent)) || 2.5))
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { anticipationFeePercent: fee },
  })
  revalidatePath(`/admin/clientes/${merchantId}`)
}
