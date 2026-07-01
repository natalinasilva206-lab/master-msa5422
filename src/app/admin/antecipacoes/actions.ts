'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login')
  return session
}

function getIp(): string {
  return headers().get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers().get('x-real-ip')
    ?? 'desconhecido'
}

export async function approveAntecipacao(id: string, adminNotes?: string, customFeePercent?: number) {
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

  // Admin can override the fee at approval time
  const finalFeePercent = customFeePercent !== undefined
    ? Math.max(0, Math.min(20, customFeePercent))
    : ant.feePercent
  const finalFeeAmount = Math.round(ant.requestedAmount * (finalFeePercent / 100) * 100) / 100
  const finalNetAmount = Math.round((ant.requestedAmount - finalFeeAmount) * 100) / 100

  await prisma.$transaction([
    prisma.anticipation.update({
      where: { id },
      data: {
        status: 'APROVADA',
        feePercent: finalFeePercent,
        feeAmount: finalFeeAmount,
        netAmount: finalNetAmount,
        adminNotes: adminNotes || null,
        resolvedBy: admin.id,
        resolvedAt: new Date(),
      },
    }),
    prisma.merchant.update({
      where: { id: ant.merchantId },
      data: {
        futureBalance: { decrement: ant.requestedAmount },
        pendingBalance: { increment: finalNetAmount },
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
          feePercent: finalFeePercent,
          feeAmount: finalFeeAmount,
          netAmount: finalNetAmount,
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
  const session = await requireAdmin()
  const admin   = session.user as any

  const fee = Math.max(0, Math.min(20, parseFloat(String(feePercent)) || 2.5))

  const merchant = await prisma.merchant.findUnique({
    where:  { id: merchantId },
    select: { name: true, anticipationFeePercent: true },
  })
  if (!merchant) return

  const before = merchant.anticipationFeePercent

  await prisma.$transaction([
    prisma.merchant.update({
      where: { id: merchantId },
      data:  { anticipationFeePercent: fee },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'ANTICIPATION_FEE_UPDATED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          merchantId,
          merchantName: merchant.name,
          before:       { anticipationFeePercent: before },
          after:        { anticipationFeePercent: fee },
          adminName:    admin.name,
          adminEmail:   admin.email,
          ip:           getIp(),
          updatedAt:    new Date().toISOString(),
        }),
      },
    }),
  ])

  revalidatePath('/admin/antecipacoes')
  revalidatePath(`/admin/clientes/${merchantId}`)
}
