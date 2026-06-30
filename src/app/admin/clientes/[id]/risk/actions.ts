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
