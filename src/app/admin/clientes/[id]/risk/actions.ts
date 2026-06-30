'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { processSalePayment } from '@/lib/processSalePayment'

async function getAdminUserId() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Não autorizado')
  return user.id as string
}

export type RiskAction = 'reserve' | 'block' | 'future' | 'release_reserved' | 'release_blocked' | 'release_future'

export async function setRiskBalance(
  merchantId: string,
  action: RiskAction,
  amount: number,
  reason: string,
  releaseDate?: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()
    if (isNaN(amount) || amount < 0) return { error: 'Valor inválido.' }
    if (!reason.trim()) return { error: 'Motivo obrigatório.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    const totalProtected = merchant.reservedBalance + merchant.blockedBalance + merchant.futureBalance
    const available = merchant.pendingBalance

    let update: Record<string, number> = {}
    let auditAction = ''
    let meta: Record<string, unknown> = { amount, reason, releaseDate }

    switch (action) {
      case 'reserve': {
        // Move from pendingBalance to reservedBalance
        if (amount > available) return { error: `Saldo disponível insuficiente (R$ ${available.toFixed(2)}).` }
        update = {
          pendingBalance: merchant.pendingBalance - amount,
          reservedBalance: merchant.reservedBalance + amount,
        }
        auditAction = 'RISK_RESERVE_SET'
        meta = { ...meta, from: 'pendingBalance', to: 'reservedBalance' }
        break
      }
      case 'block': {
        // Move from pendingBalance to blockedBalance
        if (amount > available) return { error: `Saldo disponível insuficiente (R$ ${available.toFixed(2)}).` }
        update = {
          pendingBalance: merchant.pendingBalance - amount,
          blockedBalance: merchant.blockedBalance + amount,
        }
        auditAction = 'RISK_BLOCK_SET'
        meta = { ...meta, from: 'pendingBalance', to: 'blockedBalance' }
        break
      }
      case 'future': {
        // Move from pendingBalance to futureBalance (with scheduled release date)
        if (amount > available) return { error: `Saldo disponível insuficiente (R$ ${available.toFixed(2)}).` }
        if (!releaseDate) return { error: 'Data de liberação obrigatória.' }
        update = {
          pendingBalance: merchant.pendingBalance - amount,
          futureBalance: merchant.futureBalance + amount,
        }
        auditAction = 'RISK_FUTURE_SET'
        meta = { ...meta, from: 'pendingBalance', to: 'futureBalance', releaseDate }
        break
      }
      case 'release_reserved': {
        // Release back reservedBalance to pendingBalance
        const rel = Math.min(amount, merchant.reservedBalance)
        if (rel <= 0) return { error: 'Nenhum saldo reservado para liberar.' }
        update = {
          pendingBalance: merchant.pendingBalance + rel,
          reservedBalance: merchant.reservedBalance - rel,
        }
        auditAction = 'RISK_RELEASE'
        meta = { ...meta, amount: rel, from: 'reservedBalance', to: 'pendingBalance' }
        break
      }
      case 'release_blocked': {
        const rel = Math.min(amount, merchant.blockedBalance)
        if (rel <= 0) return { error: 'Nenhum saldo bloqueado para liberar.' }
        update = {
          pendingBalance: merchant.pendingBalance + rel,
          blockedBalance: merchant.blockedBalance - rel,
        }
        auditAction = 'RISK_RELEASE'
        meta = { ...meta, amount: rel, from: 'blockedBalance', to: 'pendingBalance' }
        break
      }
      case 'release_future': {
        const rel = Math.min(amount, merchant.futureBalance)
        if (rel <= 0) return { error: 'Nenhum saldo futuro para liberar.' }
        update = {
          pendingBalance: merchant.pendingBalance + rel,
          futureBalance: merchant.futureBalance - rel,
        }
        auditAction = 'RISK_RELEASE'
        meta = { ...meta, amount: rel, from: 'futureBalance', to: 'pendingBalance' }
        break
      }
      default:
        return { error: 'Ação desconhecida.' }
    }

    await prisma.$transaction([
      prisma.merchant.update({ where: { id: merchantId }, data: update }),
      prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: auditAction,
          entity: 'Merchant',
          entityId: merchantId,
          metadata: JSON.stringify(meta),
        },
      }),
    ])

    revalidatePath(`/admin/clientes/${merchantId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[setRiskBalance]', e)
    return { error: 'Erro interno.' }
  }
}

export interface RiskConfigInput {
  riskReservePercent: number
  riskReleaseDays: number
  riskLevel: string
  riskReserveMin: number
  riskReserveMax: number
  riskNotes: string
}

export async function saveRiskConfig(
  merchantId: string,
  config: RiskConfigInput,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const pct = config.riskReservePercent
    if (isNaN(pct) || pct < 0 || pct > 100) return { error: 'Percentual deve ser entre 0 e 100.' }
    const days = config.riskReleaseDays
    if (isNaN(days) || days < 0) return { error: 'Prazo inválido.' }
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(config.riskLevel)) return { error: 'Nível de risco inválido.' }

    await prisma.$transaction([
      prisma.merchant.update({
        where: { id: merchantId },
        data: {
          riskReservePercent: pct,
          riskReleaseDays:    days,
          riskLevel:          config.riskLevel,
          riskReserveMin:     config.riskReserveMin,
          riskReserveMax:     config.riskReserveMax,
          riskNotes:          config.riskNotes,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId:   adminUserId,
          action:   'RISK_CONFIG_UPDATE',
          entity:   'Merchant',
          entityId: merchantId,
          metadata: JSON.stringify(config),
        },
      }),
    ])

    revalidatePath(`/admin/clientes/${merchantId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[saveRiskConfig]', e)
    return { error: 'Erro interno.' }
  }
}

export type ReserveStatus = 'RESERVADO' | 'LIBERADO' | 'BLOQUEADO' | 'DISPUTA' | 'CANCELADO'

export async function updateReserveStatus(
  releaseId: string,
  merchantId: string,
  newStatus: ReserveStatus,
  notes?: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const adminUserId = await getAdminUserId()

    const reserve = await prisma.reserveRelease.findUnique({ where: { id: releaseId } })
    if (!reserve || reserve.merchantId !== merchantId) return { error: 'Reserva não encontrada.' }
    if (reserve.status === newStatus) return { ok: true }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    let merchantUpdate: Record<string, unknown> = {}
    let auditMeta: Record<string, unknown> = {
      reserveId: releaseId,
      from: reserve.status,
      to: newStatus,
      amount: reserve.amount,
      notes,
    }

    if (newStatus === 'LIBERADO' && reserve.status === 'RESERVADO') {
      // Move de reservedBalance para pendingBalance
      merchantUpdate = {
        pendingBalance:  { increment: reserve.amount },
        reservedBalance: { decrement: reserve.amount },
      }
    } else if (newStatus === 'RESERVADO' && reserve.status === 'LIBERADO') {
      // Reverte liberação
      merchantUpdate = {
        pendingBalance:  { decrement: reserve.amount },
        reservedBalance: { increment: reserve.amount },
      }
    }
    // BLOQUEADO / DISPUTA / CANCELADO: não move saldo (apenas muda status para rastreamento)

    const reserveUpdateOp = prisma.reserveRelease.update({
      where: { id: releaseId },
      data: {
        status:     newStatus,
        releasedAt: newStatus === 'LIBERADO' ? new Date() : null,
        releasedBy: newStatus === 'LIBERADO' ? adminUserId : null,
        notes:      notes ?? reserve.notes,
      },
    })

    const auditOp = prisma.auditLog.create({
      data: {
        userId:   adminUserId,
        action:   'RESERVE_STATUS_CHANGE',
        entity:   'ReserveRelease',
        entityId: releaseId,
        metadata: JSON.stringify(auditMeta),
      },
    })

    if (Object.keys(merchantUpdate).length > 0) {
      await prisma.$transaction([
        reserveUpdateOp,
        auditOp,
        prisma.merchant.update({ where: { id: merchantId }, data: merchantUpdate }),
      ])
    } else {
      await prisma.$transaction([reserveUpdateOp, auditOp])
    }

    revalidatePath(`/admin/clientes/${merchantId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[updateReserveStatus]', e)
    return { error: 'Erro interno.' }
  }
}

export async function triggerCronRelease(): Promise<{ error?: string; processed?: number }> {
  try {
    await getAdminUserId()
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/cron/release-reserves`,
      { method: 'GET', headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` } },
    )
    const json = await res.json()
    return { processed: json.processed ?? 0 }
  } catch (e: any) {
    return { error: e.message ?? 'Erro interno.' }
  }
}

export async function simulateSale(
  merchantId: string,
  saleAmount: number,
  description?: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const adminUserId = await getAdminUserId()

    if (!saleAmount || saleAmount <= 0) return { ok: false, error: 'Valor inválido.' }

    const result = await processSalePayment({
      merchantId,
      saleAmount,
      description: description ?? 'Venda simulada pelo ADM',
      triggeredBy: adminUserId,
    })

    revalidatePath(`/admin/clientes/${merchantId}`)
    return { ok: true, data: result as unknown as Record<string, unknown> }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { ok: false, error: 'Não autorizado.' }
    console.error('[simulateSale]', e)
    return { ok: false, error: e.message ?? 'Erro interno.' }
  }
}
