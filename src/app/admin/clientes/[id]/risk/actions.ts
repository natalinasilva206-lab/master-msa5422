'use server'

import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { processSalePayment } from '@/lib/processSalePayment'

/* ─── auth helpers ─────────────────────────────────────────── */
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

/* ─── audit log helper ──────────────────────────────────────── */
interface AuditMeta {
  action:     string
  entityId:   string
  entity:     string
  before?:    Record<string, unknown>
  after?:     Record<string, unknown>
  amount?:    number
  reason?:    string
  notes?:     string
  extra?:     Record<string, unknown>
  adminName?: string
  adminEmail?:string
  ip?:        string
}

function buildMeta(m: AuditMeta, admin: { name: string; email: string }, ip: string): string {
  return JSON.stringify({
    ...m.extra,
    before:     m.before,
    after:      m.after,
    amount:     m.amount,
    reason:     m.reason,
    notes:      m.notes,
    adminName:  admin.name,
    adminEmail: admin.email,
    ip,
  })
}

/* ─── setRiskBalance ─────────────────────────────────────────── */
export type RiskAction = 'reserve' | 'block' | 'future' | 'release_reserved' | 'release_blocked' | 'release_future'

export async function setRiskBalance(
  merchantId: string,
  action: RiskAction,
  amount: number,
  reason: string,
  releaseDate?: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const admin = await getAdminSession()
    const ip    = getIp()

    if (isNaN(amount) || amount < 0) return { error: 'Valor inválido.' }
    if (!reason.trim()) return { error: 'Motivo obrigatório.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    const available = merchant.pendingBalance

    let update: Record<string, number> = {}
    let auditAction = ''
    let from = ''
    let to   = ''
    let effectiveAmount = amount

    switch (action) {
      case 'reserve': {
        if (amount > available) return { error: `Saldo disponível insuficiente (R$ ${available.toFixed(2)}).` }
        update = {
          pendingBalance:  merchant.pendingBalance  - amount,
          reservedBalance: merchant.reservedBalance + amount,
        }
        auditAction = 'RISK_RESERVE_SET'
        from = 'pendingBalance'
        to   = 'reservedBalance'
        break
      }
      case 'block': {
        if (amount > available) return { error: `Saldo disponível insuficiente (R$ ${available.toFixed(2)}).` }
        update = {
          pendingBalance: merchant.pendingBalance  - amount,
          blockedBalance: merchant.blockedBalance  + amount,
        }
        auditAction = 'RISK_BLOCK_SET'
        from = 'pendingBalance'
        to   = 'blockedBalance'
        break
      }
      case 'future': {
        if (amount > available) return { error: `Saldo disponível insuficiente (R$ ${available.toFixed(2)}).` }
        if (!releaseDate) return { error: 'Data de liberação obrigatória.' }
        update = {
          pendingBalance: merchant.pendingBalance - amount,
          futureBalance:  merchant.futureBalance  + amount,
        }
        auditAction = 'RISK_FUTURE_SET'
        from = 'pendingBalance'
        to   = 'futureBalance'
        break
      }
      case 'release_reserved': {
        effectiveAmount = Math.min(amount, merchant.reservedBalance)
        if (effectiveAmount <= 0) return { error: 'Nenhum saldo reservado para liberar.' }
        update = {
          pendingBalance:  merchant.pendingBalance  + effectiveAmount,
          reservedBalance: merchant.reservedBalance - effectiveAmount,
        }
        auditAction = 'RISK_RELEASE'
        from = 'reservedBalance'
        to   = 'pendingBalance'
        break
      }
      case 'release_blocked': {
        effectiveAmount = Math.min(amount, merchant.blockedBalance)
        if (effectiveAmount <= 0) return { error: 'Nenhum saldo bloqueado para liberar.' }
        update = {
          pendingBalance:  merchant.pendingBalance  + effectiveAmount,
          blockedBalance:  merchant.blockedBalance  - effectiveAmount,
        }
        auditAction = 'RISK_RELEASE'
        from = 'blockedBalance'
        to   = 'pendingBalance'
        break
      }
      case 'release_future': {
        effectiveAmount = Math.min(amount, merchant.futureBalance)
        if (effectiveAmount <= 0) return { error: 'Nenhum saldo futuro para liberar.' }
        update = {
          pendingBalance: merchant.pendingBalance + effectiveAmount,
          futureBalance:  merchant.futureBalance  - effectiveAmount,
        }
        auditAction = 'RISK_RELEASE'
        from = 'futureBalance'
        to   = 'pendingBalance'
        break
      }
      default:
        return { error: 'Ação desconhecida.' }
    }

    const before: Record<string, number> = {
      pendingBalance:  merchant.pendingBalance,
      reservedBalance: merchant.reservedBalance,
      blockedBalance:  merchant.blockedBalance,
      futureBalance:   merchant.futureBalance,
    }
    const after: Record<string, number> = { ...before, ...update }

    await prisma.$transaction([
      prisma.merchant.update({ where: { id: merchantId }, data: update }),
      prisma.auditLog.create({
        data: {
          userId:   admin.id,
          action:   auditAction,
          entity:   'Merchant',
          entityId: merchantId,
          metadata: buildMeta({
            action: auditAction, entity: 'Merchant', entityId: merchantId,
            before, after,
            amount: effectiveAmount,
            reason,
            extra: { from, to, releaseDate: releaseDate ?? null, merchantName: merchant.name },
          }, admin, ip),
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

/* ─── saveRiskConfig ─────────────────────────────────────────── */
export interface RiskConfigInput {
  riskReservePercent: number
  riskReleaseDays:    number
  riskLevel:          string
  riskReserveMin:     number
  riskReserveMax:     number
  riskNotes:          string
  reason:             string
}

export async function saveRiskConfig(
  merchantId: string,
  config: RiskConfigInput,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const admin = await getAdminSession()
    const ip    = getIp()

    const pct = config.riskReservePercent
    if (isNaN(pct) || pct < 0 || pct > 100) return { error: 'Percentual deve ser entre 0 e 100.' }
    if (isNaN(config.riskReleaseDays) || config.riskReleaseDays < 0) return { error: 'Prazo inválido.' }
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(config.riskLevel)) return { error: 'Nível de risco inválido.' }
    if (config.riskReserveMin > 0 && config.riskReserveMax > 0 && config.riskReserveMin > config.riskReserveMax) {
      return { error: 'Valor mínimo de reserva não pode ser maior que o máximo.' }
    }
    if (!config.reason.trim()) return { error: 'Motivo da alteração é obrigatório.' }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    const before = {
      riskReservePercent: merchant.riskReservePercent,
      riskReleaseDays:    merchant.riskReleaseDays,
      riskLevel:          merchant.riskLevel,
      riskReserveMin:     merchant.riskReserveMin,
      riskReserveMax:     merchant.riskReserveMax,
      riskNotes:          merchant.riskNotes,
    }

    await prisma.$transaction([
      prisma.merchant.update({
        where: { id: merchantId },
        data: {
          riskReservePercent: pct,
          riskReleaseDays:    config.riskReleaseDays,
          riskLevel:          config.riskLevel,
          riskReserveMin:     config.riskReserveMin,
          riskReserveMax:     config.riskReserveMax,
          riskNotes:          config.riskNotes,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'RISK_CONFIG_UPDATE',
          entity:   'Merchant',
          entityId: merchantId,
          metadata: buildMeta({
            action: 'RISK_CONFIG_UPDATE', entity: 'Merchant', entityId: merchantId,
            before,
            after: { ...config },
            reason: config.reason,
            extra: { merchantName: merchant.name },
          }, admin, ip),
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

/* ─── updateReserveStatus ───────────────────────────────────── */
export type ReserveStatus = 'RESERVADO' | 'LIBERADO' | 'BLOQUEADO' | 'DISPUTA' | 'CANCELADO'

export async function updateReserveStatus(
  releaseId: string,
  merchantId: string,
  newStatus: ReserveStatus,
  notes?: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const admin = await getAdminSession()
    const ip    = getIp()

    const reserve = await prisma.reserveRelease.findUnique({ where: { id: releaseId } })
    if (!reserve || reserve.merchantId !== merchantId) return { error: 'Reserva não encontrada.' }
    if (reserve.status === newStatus) return { ok: true }

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    let merchantUpdate: Record<string, unknown> = {}

    if (newStatus === 'LIBERADO' && reserve.status === 'RESERVADO') {
      merchantUpdate = {
        pendingBalance:  { increment: reserve.amount },
        reservedBalance: { decrement: reserve.amount },
      }
    } else if (newStatus === 'RESERVADO' && reserve.status === 'LIBERADO') {
      merchantUpdate = {
        pendingBalance:  { decrement: reserve.amount },
        reservedBalance: { increment: reserve.amount },
      }
    } else if (newStatus === 'CANCELADO' && reserve.status === 'RESERVADO') {
      // Devolve o valor ao saldo disponível ao cancelar uma reserva ativa
      merchantUpdate = {
        pendingBalance:  { increment: reserve.amount },
        reservedBalance: { decrement: reserve.amount },
      }
    }

    const reserveUpdateOp = prisma.reserveRelease.update({
      where: { id: releaseId },
      data: {
        status:     newStatus,
        releasedAt: newStatus === 'LIBERADO' ? new Date() : null,
        releasedBy: newStatus === 'LIBERADO' ? admin.id : null,
        notes:      notes ?? reserve.notes,
      },
    })

    const auditOp = prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'RESERVE_STATUS_CHANGE',
        entity:   'ReserveRelease',
        entityId: releaseId,
        metadata: buildMeta({
          action: 'RESERVE_STATUS_CHANGE', entity: 'ReserveRelease', entityId: releaseId,
          before: { status: reserve.status, amount: reserve.amount },
          after:  { status: newStatus,       amount: reserve.amount },
          amount: reserve.amount,
          notes,
          extra:  {
            merchantId,
            merchantName: merchant.name,
            saleLogId:    reserve.saleLogId,
            saleDate:     reserve.saleDate,
          },
        }, admin, ip),
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

/* ─── triggerCronRelease ────────────────────────────────────── */
export async function triggerCronRelease(): Promise<{ error?: string; processed?: number }> {
  try {
    await getAdminSession()
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

/* ─── applyMasterScoreSuggestion ────────────────────────────── */
export async function applyMasterScoreSuggestion(
  merchantId: string,
  suggestedPercent: number,
  suggestedDays:    number,
  suggestedLevel:   string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const admin = await getAdminSession()
    const ip    = getIp()

    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) return { error: 'Seller não encontrado.' }

    const before = {
      riskReservePercent: merchant.riskReservePercent,
      riskReleaseDays:    merchant.riskReleaseDays,
      riskLevel:          merchant.riskLevel,
    }

    await prisma.$transaction([
      prisma.merchant.update({
        where: { id: merchantId },
        data: {
          riskReservePercent: suggestedPercent,
          riskReleaseDays:    suggestedDays,
          riskLevel:          suggestedLevel,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId:   admin.id,
          action:   'RISK_CONFIG_UPDATE',
          entity:   'Merchant',
          entityId: merchantId,
          metadata: buildMeta({
            action: 'RISK_CONFIG_UPDATE', entity: 'Merchant', entityId: merchantId,
            before,
            after: { riskReservePercent: suggestedPercent, riskReleaseDays: suggestedDays, riskLevel: suggestedLevel },
            notes: 'Aplicado via sugestão do Master Score',
            extra: { merchantName: merchant.name, source: 'master_score' },
          }, admin, ip),
        },
      }),
    ])

    revalidatePath(`/admin/clientes/${merchantId}`)
    return { ok: true }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { error: 'Não autorizado.' }
    console.error('[applyMasterScoreSuggestion]', e)
    return { error: e.message ?? 'Erro interno.' }
  }
}

/* ─── simulateSale ───────────────────────────────────────────── */
export async function simulateSale(
  merchantId: string,
  saleAmount: number,
  description?: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const admin = await getAdminSession()

    if (!saleAmount || saleAmount <= 0) return { ok: false, error: 'Valor inválido.' }

    const result = await processSalePayment({
      merchantId,
      saleAmount,
      description: description ?? 'Venda simulada pelo ADM',
      triggeredBy: admin.id,
    })

    revalidatePath(`/admin/clientes/${merchantId}`)
    return { ok: true, data: result as unknown as Record<string, unknown> }
  } catch (e: any) {
    if (e.message === 'Não autorizado') return { ok: false, error: 'Não autorizado.' }
    console.error('[simulateSale]', e)
    return { ok: false, error: e.message ?? 'Erro interno.' }
  }
}
