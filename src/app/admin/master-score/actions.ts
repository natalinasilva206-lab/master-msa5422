'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcMasterScore } from '@/lib/masterScore'

// Derivar o ScoreInput de um merchant a partir dos dados do banco
async function buildScoreInput(merchantId: string, merchant: {
  balance: number
  pendingBalance: number
  reservedBalance: number
  createdAt: Date
}) {
  const now      = new Date()
  const ms30     = 30 * 24 * 60 * 60 * 1000
  const since30d = new Date(now.getTime() - ms30)
  const since60d = new Date(now.getTime() - ms30 * 2)

  const [
    vendas30d,
    vendas30_60d,
    todasVendas,
    chargebacks,
    medPix,
    reembolsos,
  ] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityId: merchantId, action: 'BALANCE_ADJUST', createdAt: { gte: since30d } },
      select: { metadata: true },
    }),
    prisma.auditLog.findMany({
      where: { entityId: merchantId, action: 'BALANCE_ADJUST', createdAt: { gte: since60d, lt: since30d } },
      select: { metadata: true },
    }),
    prisma.auditLog.count({ where: { entityId: merchantId, action: 'BALANCE_ADJUST' } }),
    prisma.auditLog.count({
      where: { entityId: merchantId, action: { in: ['CHARGEBACK_OPENED', 'DISPUTE_OPENED'] } },
    }),
    prisma.auditLog.count({
      where: { entityId: merchantId, action: { in: ['MED_PIX_REQUEST', 'FRAUD_FLAG', 'ANTIFRAUDE_FLAG'] } },
    }),
    prisma.auditLog.count({
      where: { entityId: merchantId, action: { in: ['WITHDRAW_DENIED', 'ESTORNO', 'REEMBOLSO'] } },
    }),
  ])

  function sumAmt(logs: { metadata: string | null }[]) {
    return logs.reduce((s, l) => {
      try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
    }, 0)
  }

  const diasDesdeCriacao = Math.floor((now.getTime() - merchant.createdAt.getTime()) / 86400000)

  return {
    volumeMensal:      sumAmt(vendas30d),
    volumeMesAnterior: sumAmt(vendas30_60d),
    totalVendas:       todasVendas,
    chargebacks,
    medPixCount:       medPix,
    reembolsos,
    saldoDisponivel:   merchant.pendingBalance,
    saldoCdi:          merchant.balance,
    reservaAtual:      merchant.reservedBalance,
    diasDesdeCriacao,
  }
}

// Recalcular o score de UM seller específico
export async function recalcSellerScore(merchantId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true },
    })
    if (!merchant) return { ok: false, error: 'Seller não encontrado' }

    const input  = await buildScoreInput(merchantId, merchant)
    const result = calcMasterScore(input)

    await prisma.masterScore.upsert({
      where:  { merchantId },
      create: {
        merchantId,
        ...result,
        dataUltimaAtualizacao: new Date(),
      },
      update: {
        ...result,
        dataUltimaAtualizacao: new Date(),
      },
    })

    return { ok: true }
  } catch (err: any) {
    console.error('[recalcSellerScore]', err)
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

// Recalcular o score de TODOS os sellers (usado pela tela administrativa)
export async function recalcAllScores(): Promise<{ ok: boolean; updated: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, updated: 0, error: 'Não autorizado' }

  try {
    const merchants = await prisma.merchant.findMany({
      select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true },
    })

    let updated = 0
    for (const m of merchants) {
      const input  = await buildScoreInput(m.id, m)
      const result = calcMasterScore(input)
      await prisma.masterScore.upsert({
        where:  { merchantId: m.id },
        create: { merchantId: m.id, ...result, dataUltimaAtualizacao: new Date() },
        update: { ...result, dataUltimaAtualizacao: new Date() },
      })
      updated++
    }

    return { ok: true, updated }
  } catch (err: any) {
    console.error('[recalcAllScores]', err)
    return { ok: false, updated: 0, error: err?.message ?? 'Erro interno' }
  }
}

// Salvar observação interna de um score (anotação manual do ADM)
export async function saveScoreObservacao(merchantId: string, observacao: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  try {
    await prisma.masterScore.upsert({
      where:  { merchantId },
      create: { merchantId, observacaoInterna: observacao },
      update: { observacaoInterna: observacao, updatedAt: new Date() },
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}
