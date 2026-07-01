'use server'

import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { dispatchWebhook } from '@/lib/dispatchWebhook'

/* ─── auth helpers ──────────────────────────────────────────── */
async function getAdminSession() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Não autorizado')
  return { id: user.id as string, name: user.name as string, email: user.email as string }
}

function getIp(): string {
  try {
    const h = headers()
    return (
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      'unknown'
    )
  } catch {
    return 'unknown'
  }
}

function buildMeta(data: Record<string, unknown>, admin: { name: string; email: string }, ip: string): string {
  return JSON.stringify({ ...data, adminName: admin.name, adminEmail: admin.email, ip })
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
    const admin = await getAdminSession()
    const ip    = getIp()

    if (!input.merchantId) return { error: 'Seller obrigatório.' }
    if (!input.contestedAmount || input.contestedAmount <= 0) return { error: 'Valor contestado inválido.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: input.merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    // Tipos que geram uma entrada financeira no SaleLog
    const SALE_LOG_TYPE: Record<string, string | null> = {
      CHARGEBACK:          'ESTORNO',
      MED_PIX:             'MED_PIX',
      REEMBOLSO:           'REEMBOLSO',
      DISPUTA_MANUAL:      null,
      BLOQUEIO_PREVENTIVO: null,
    }

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

      // Registra no SaleLog para métricas de risco
      const saleLogType = SALE_LOG_TYPE[input.type]
      if (saleLogType) {
        await tx.saleLog.create({
          data: {
            merchantId: input.merchantId,
            amount:     input.contestedAmount,
            type:       saleLogType,
            status:     'APROVADO',
            disputeId:  d.id,
            description: `Caso aberto: ${input.type}`,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'DISPUTE_OPENED',
          entity:   'Dispute',
          entityId: d.id,
          metadata: buildMeta({
            merchantId:      input.merchantId,
            merchantName:    merchant.name,
            type:            input.type,
            contestedAmount: input.contestedAmount,
            deadline:        input.deadline ?? null,
            assignedTo:      input.assignedTo ?? null,
            notes:           input.notes ?? null,
            after:           { status: 'ABERTO', contestedAmount: input.contestedAmount },
          }, admin, ip),
        },
      })

      return d
    })

    dispatchWebhook(input.merchantId, 'dispute.opened', { disputeId: dispute.id, type: input.type, contestedAmount: input.contestedAmount }).catch(() => {})

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/clientes/${input.merchantId}`)
    revalidatePath(`/admin/clientes/${input.merchantId}/historico`)
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
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true } } },
    })
    if (!dispute) return { error: 'Caso não encontrado.' }

    const isResolved = ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO'].includes(newStatus)
    // Quando resolvido a favor do seller, o estorno/MED não se concretizou — cancela no SaleLog
    const cancelSaleLog = newStatus === 'RESOLVIDO_SELLER'

    await prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status:     newStatus,
          resolvedAt: isResolved ? new Date() : null,
          notes:      notes !== undefined ? notes : dispute.notes,
        },
      })

      if (cancelSaleLog) {
        await tx.saleLog.updateMany({
          where: { disputeId, status: 'APROVADO' },
          data:  { status: 'CANCELADO' },
        })
      }

      await tx.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'DISPUTE_STATUS_CHANGE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:   dispute.merchantId,
            merchantName: dispute.merchant.name,
            before:       { status: dispute.status },
            after:        { status: newStatus },
            notes,
          }, admin, ip),
        },
      })
    })

    dispatchWebhook(dispute.merchantId, 'dispute.updated', { disputeId, newStatus }).catch(() => {})

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}/historico`)
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
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true, pendingBalance: true, blockedBalance: true } } },
    })
    if (!dispute) return { error: 'Caso não encontrado.' }

    if (amount <= 0 || isNaN(amount)) return { error: 'Valor inválido.' }
    if (amount > dispute.merchant.pendingBalance) {
      return { error: `Saldo disponível insuficiente (R$ ${dispute.merchant.pendingBalance.toFixed(2)}).` }
    }

    const before = {
      pendingBalance: dispute.merchant.pendingBalance,
      blockedBalance: dispute.merchant.blockedBalance,
    }

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
          userId:   admin.id,
          action:   'DISPUTE_BLOCK',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:   dispute.merchantId,
            merchantName: dispute.merchant.name,
            amount,
            from: 'pendingBalance',
            to:   'blockedBalance',
            before,
            after: {
              pendingBalance: before.pendingBalance - amount,
              blockedBalance: before.blockedBalance + amount,
            },
          }, admin, ip),
        },
      }),
    ])

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}/historico`)
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
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true, reservedBalance: true, blockedBalance: true } } },
    })
    if (!dispute) return { error: 'Caso não encontrado.' }

    if (amount <= 0 || isNaN(amount)) return { error: 'Valor inválido.' }
    if (amount > dispute.merchant.reservedBalance) {
      return { error: `Saldo reservado insuficiente (R$ ${dispute.merchant.reservedBalance.toFixed(2)}).` }
    }

    const before = {
      reservedBalance: dispute.merchant.reservedBalance,
      blockedBalance:  dispute.merchant.blockedBalance,
    }

    // Marca as ReserveRelease mais antigas como DISPUTA para impedir que o cron
    // libere automaticamente saldo que já foi movido para blockedBalance.
    // Se um entry é apenas parcialmente consumido, ele é dividido:
    //   - entry original: amount = parcela consumida, status = DISPUTA
    //   - novo entry: amount = restante, todos os outros campos iguais, status = RESERVADO
    const reservesToMark = await prisma.reserveRelease.findMany({
      where: { merchantId: dispute.merchantId, status: 'RESERVADO' },
      orderBy: { saleDate: 'asc' },
      select: {
        id: true, amount: true, merchantId: true, saleLogId: true,
        saleAmount: true, reservePercent: true, releaseDays: true,
        saleDate: true, releaseAt: true,
      },
    })

    let remaining = amount
    const reserveIdsToMark: string[] = []
    let partialEntry: (typeof reservesToMark)[0] | null = null
    let partialConsumed = 0

    for (const r of reservesToMark) {
      if (remaining <= 0) break
      if (r.amount <= remaining) {
        // Entry inteiramente consumido
        reserveIdsToMark.push(r.id)
        remaining -= r.amount
      } else {
        // Entry parcialmente consumido — registra para split
        partialEntry = r
        partialConsumed = remaining
        remaining = 0
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.merchant.update({
        where: { id: dispute.merchantId },
        data: {
          reservedBalance: { decrement: amount },
          blockedBalance:  { increment: amount },
        },
      })

      await tx.dispute.update({
        where: { id: disputeId },
        data: { blockedAmount: { increment: amount } },
      })

      if (reserveIdsToMark.length > 0) {
        await tx.reserveRelease.updateMany({
          where: { id: { in: reserveIdsToMark } },
          data: { status: 'DISPUTA' },
        })
      }

      if (partialEntry && partialConsumed > 0) {
        // Reduz o entry original ao valor consumido e marca como DISPUTA
        await tx.reserveRelease.update({
          where: { id: partialEntry.id },
          data: { amount: partialConsumed, status: 'DISPUTA' },
        })
        // Cria entry para o restante, mantendo prazo e metadados originais
        await tx.reserveRelease.create({
          data: {
            merchantId:     partialEntry.merchantId,
            saleLogId:      partialEntry.saleLogId,
            amount:         partialEntry.amount - partialConsumed,
            saleAmount:     partialEntry.saleAmount,
            reservePercent: partialEntry.reservePercent,
            releaseDays:    partialEntry.releaseDays,
            saleDate:       partialEntry.saleDate,
            releaseAt:      partialEntry.releaseAt,
            status:         'RESERVADO',
          },
        })
      }

      await tx.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'DISPUTE_USE_RESERVE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:     dispute.merchantId,
            merchantName:   dispute.merchant.name,
            amount,
            from:           'reservedBalance',
            to:             'blockedBalance',
            markedReserves: reserveIdsToMark,
            partialSplit:   partialEntry ? { id: partialEntry.id, consumed: partialConsumed, remainder: partialEntry.amount - partialConsumed } : null,
            before,
            after: {
              reservedBalance: before.reservedBalance - amount,
              blockedBalance:  before.blockedBalance  + amount,
            },
          }, admin, ip),
        },
      })
    })

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}/historico`)
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
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true, pendingBalance: true, blockedBalance: true } } },
    })
    if (!dispute) return { error: 'Caso não encontrado.' }

    if (amount <= 0 || isNaN(amount)) return { error: 'Valor inválido.' }
    const canRelease = Math.min(amount, dispute.blockedAmount, dispute.merchant.blockedBalance)
    if (canRelease <= 0) return { error: 'Nenhum saldo bloqueado para liberar neste caso.' }

    const before = {
      pendingBalance: dispute.merchant.pendingBalance,
      blockedBalance: dispute.merchant.blockedBalance,
    }

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
          userId:   admin.id,
          action:   'DISPUTE_RELEASE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:   dispute.merchantId,
            merchantName: dispute.merchant.name,
            amount: canRelease,
            from: 'blockedBalance',
            to:   'pendingBalance',
            before,
            after: {
              blockedBalance: before.blockedBalance - canRelease,
              pendingBalance: before.pendingBalance + canRelease,
            },
          }, admin, ip),
        },
      }),
    ])

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}`)
    revalidatePath(`/admin/clientes/${dispute.merchantId}/historico`)
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
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true } } },
    })
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
          userId:   admin.id,
          action:   'DISPUTE_NOTE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:   dispute.merchantId,
            merchantName: dispute.merchant.name,
            note,
          }, admin, ip),
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
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true } } },
    })
    if (!dispute) return { error: 'Caso não encontrado.' }
    if (!docName.trim()) return { error: 'Nome do documento obrigatório.' }

    let current: string[] = []
    try { current = JSON.parse(dispute.documents || '[]') } catch { current = [] }
    current.push(docName.trim())

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: disputeId },
        data: { documents: JSON.stringify(current) },
      }),
      prisma.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'DISPUTE_DOCUMENT',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:   dispute.merchantId,
            merchantName: dispute.merchant.name,
            docName,
          }, admin, ip),
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

export async function assignDispute(disputeId: string): Promise<{ error?: string; name?: string }> {
  try {
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true } } },
    })
    if (!dispute) return { error: 'Caso não encontrado.' }

    await prisma.$transaction([
      prisma.dispute.update({ where: { id: disputeId }, data: { assignedTo: admin.name } }),
      prisma.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'DISPUTE_FIELDS_UPDATE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:   dispute.merchantId,
            merchantName: dispute.merchant.name,
            before: { assignedTo: dispute.assignedTo },
            after:  { assignedTo: admin.name },
          }, admin, ip),
        },
      }),
    ])

    revalidatePath('/admin/disputas')
    revalidatePath(`/admin/disputas/${disputeId}`)
    return { name: admin.name }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[assignDispute]', e)
    return { error: 'Erro interno.' }
  }
}

export async function updateDisputeFields(
  disputeId: string,
  fields: { assignedTo?: string; deadline?: string; saleLogId?: string },
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const admin = await getAdminSession()
    const ip    = getIp()

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { merchant: { select: { id: true, name: true } } },
    })
    if (!dispute) return { error: 'Caso não encontrado.' }

    const before = {
      assignedTo: dispute.assignedTo,
      deadline:   dispute.deadline?.toISOString() ?? null,
      saleLogId:  dispute.saleLogId,
    }

    await prisma.$transaction([
      prisma.dispute.update({
        where: { id: disputeId },
        data: {
          assignedTo: fields.assignedTo,
          deadline:   fields.deadline ? new Date(fields.deadline) : undefined,
          saleLogId:  fields.saleLogId !== undefined ? fields.saleLogId || null : undefined,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'DISPUTE_FIELDS_UPDATE',
          entity:   'Dispute',
          entityId: disputeId,
          metadata: buildMeta({
            merchantId:   dispute.merchantId,
            merchantName: dispute.merchant.name,
            before,
            after: fields,
          }, admin, ip),
        },
      }),
    ])

    revalidatePath(`/admin/disputas/${disputeId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[updateDisputeFields]', e)
    return { error: 'Erro interno.' }
  }
}
