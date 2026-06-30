'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function getAdminUserId() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Não autorizado')
  return user.id as string
}

export type DisputeType =
  | 'CHARGEBACK'
  | 'MED_PIX'
  | 'REEMBOLSO'
  | 'DISPUTA_MANUAL'
  | 'BLOQUEIO_PREVENTIVO'

export type DisputeStatus =
  | 'ABERTO'
  | 'EM_ANALISE'
  | 'AGUARDANDO_DOCUMENTO'
  | 'BLOQUEADO'
  | 'RESOLVIDO_SELLER'
  | 'RESOLVIDO_CONTRA'
  | 'DEVOLVIDO_PARCIAL'
  | 'FINALIZADO'

export interface CreateDisputeInput {
  type:            DisputeType
  merchantId:      string
  saleLogId?:      string
  contestedAmount: number
  deadline?:       string   // ISO date
  assignedTo?:     string
  notes?:          string
}

export async function createDispute(
  input: CreateDisputeInput,
): Promise<{ error?: string; id?: string }> {
  try {
    const adminUserId = await getAdminUserId()

    if (!input.merchantId) return { error: 'Seller obrigatório.' }
    if (!input.contestedAmount || input.contestedAmount <= 0) return { error: 'Valor contestado inválido.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: input.merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    const dispute = await prisma.$transaction(async (tx) => {
      const d = await tx.dispute.create({
        data: {
          type:            input.type,
          merchantId:      input.merchantId,
          saleLogId:       input.saleLogId ?? null,
          contestedAmount: input.contestedAmount,
          status:          'ABERTO',
          deadline:        input.deadline ? new Date(input.deadline) : null,
          assignedTo:      input.assignedTo ?? null,
          notes:           input.notes ?? null,
        },
      })

      await tx.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'DISPUTE_OPENED',
          entity:   'Dispute',
          entityId: d.id,
          metadata: JSON.stringify({ type: input.type, merchantId: input.merchantId, contestedAmount: input.contestedAmount }),
        },
      })

      return d
    })

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/clientes/${input.merchantId}`)
    return { id: dispute.id }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[createDispute]', e)
    return { error: 'Erro interno.' }
  }
}

export async function updateDisputeStatus(
  disputeId: string,
  newStatus: DisputeStatus,
  notes?: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) return { error: 'Caso não encontrado.' }

    const isResolved = ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO'].includes(newStatus)

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status:     newStatus,
          resolvedAt: isResolved ? new Date() : null,
          notes:      notes !== undefined ? notes : dispute.notes,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'DISPUTE_STATUS_CHANGE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: JSON.stringify({ from: dispute.status, to: newStatus, notes }),
        },
      }),
    ])

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[updateDisputeStatus]', e)
    return { error: 'Erro interno.' }
  }
}

// Bloqueia saldo do seller para cobrir o caso (pendingBalance → blockedBalance)
export async function blockForDispute(
  disputeId: string,
  amount: number,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) return { error: 'Caso não encontrado.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: dispute.merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    if (amount <= 0 || isNaN(amount)) return { error: 'Valor inválido.' }
    if (amount > merchant.pendingBalance) return { error: `Saldo disponível insuficiente (R$ ${merchant.pendingBalance.toFixed(2)}).` }

    await prisma.$transaction([
      prisma.merchant.update({
        where: { id: dispute.merchantId },
        data: {
          pendingBalance:  { decrement: amount },
          blockedBalance:  { increment: amount },
        },
      }),
      prisma.dispute.update({
        where: { id: disputeId },
        data: { blockedAmount: { increment: amount }, status: 'BLOQUEADO' },
      }),
      prisma.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'DISPUTE_BLOCK',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: JSON.stringify({ amount, from: 'pendingBalance', to: 'blockedBalance' }),
        },
      }),
    ])

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[blockForDispute]', e)
    return { error: 'Erro interno.' }
  }
}

// Usa saldo reservado para cobrir o caso (reservedBalance → blockedBalance vinculado ao caso)
export async function useReserveForDispute(
  disputeId: string,
  amount: number,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) return { error: 'Caso não encontrado.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: dispute.merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    if (amount <= 0 || isNaN(amount)) return { error: 'Valor inválido.' }
    if (amount > merchant.reservedBalance) return { error: `Saldo reservado insuficiente (R$ ${merchant.reservedBalance.toFixed(2)}).` }

    await prisma.$transaction([
      prisma.merchant.update({
        where: { id: dispute.merchantId },
        data: {
          reservedBalance: { decrement: amount },
          blockedBalance:  { increment: amount },
        },
      }),
      prisma.dispute.update({
        where: { id: disputeId },
        data: { blockedAmount: { increment: amount } },
      }),
      prisma.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'DISPUTE_USE_RESERVE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: JSON.stringify({ amount, from: 'reservedBalance', to: 'blockedBalance' }),
        },
      }),
    ])

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[useReserveForDispute]', e)
    return { error: 'Erro interno.' }
  }
}

// Libera saldo bloqueado de volta ao disponível do seller
export async function releaseBlockedForDispute(
  disputeId: string,
  amount: number,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) return { error: 'Caso não encontrado.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: dispute.merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    if (amount <= 0 || isNaN(amount)) return { error: 'Valor inválido.' }
    const canRelease = Math.min(amount, dispute.blockedAmount, merchant.blockedBalance)
    if (canRelease <= 0) return { error: 'Nenhum saldo bloqueado para liberar neste caso.' }

    await prisma.$transaction([
      prisma.merchant.update({
        where: { id: dispute.merchantId },
        data: {
          blockedBalance:  { decrement: canRelease },
          pendingBalance:  { increment: canRelease },
        },
      }),
      prisma.dispute.update({
        where: { id: disputeId },
        data: { blockedAmount: { decrement: canRelease } },
      }),
      prisma.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'DISPUTE_RELEASE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: JSON.stringify({ amount: canRelease, from: 'blockedBalance', to: 'pendingBalance' }),
        },
      }),
    ])

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[releaseBlockedForDispute]', e)
    return { error: 'Erro interno.' }
  }
}

export async function addDisputeNote(
  disputeId: string,
  note: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) return { error: 'Caso não encontrado.' }
    if (!note.trim()) return { error: 'Observação não pode ser vazia.' }

    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const separator = dispute.notes ? '\n\n' : ''
    const appended = `${dispute.notes ?? ''}${separator}[${now}] ${note.trim()}`

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: disputeId },
        data: { notes: appended },
      }),
      prisma.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'DISPUTE_NOTE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: JSON.stringify({ note }),
        },
      }),
    ])

    revalidatePath(`/admin/disputas/${disputeId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[addDisputeNote]', e)
    return { error: 'Erro interno.' }
  }
}

export async function addDisputeDocument(
  disputeId: string,
  docName: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } })
    if (!dispute) return { error: 'Caso não encontrado.' }
    if (!docName.trim()) return { error: 'Nome do documento obrigatório.' }

    const current: string[] = JSON.parse(dispute.documents ?? '[]')
    current.push(docName.trim())

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: disputeId },
        data: { documents: JSON.stringify(current) },
      }),
      prisma.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'DISPUTE_DOCUMENT',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: JSON.stringify({ docName }),
        },
      }),
    ])

    revalidatePath(`/admin/disputas/${disputeId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[addDisputeDocument]', e)
    return { error: 'Erro interno.' }
  }
}

export async function updateDisputeFields(
  disputeId: string,
  fields: { assignedTo?: string; deadline?: string; saleLogId?: string },
): Promise<{ error?: string; ok?: boolean }> {
  try {
    await getAdminUserId()

    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        assignedTo: fields.assignedTo,
        deadline:   fields.deadline ? new Date(fields.deadline) : undefined,
        saleLogId:  fields.saleLogId !== undefined ? fields.saleLogId || null : undefined,
      },
    })

    revalidatePath(`/admin/disputas/${disputeId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[updateDisputeFields]', e)
    return { error: 'Erro interno.' }
  }
}
