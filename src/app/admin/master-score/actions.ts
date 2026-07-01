'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcMasterScore, type ScoreInput } from '@/lib/masterScore'

// ─── Derivar ScoreInput de um merchant ───────────────────────────────────────

async function buildScoreInput(
  merchantId: string,
  merchant: { balance: number; pendingBalance: number; reservedBalance: number; createdAt: Date; plan: string }
): Promise<ScoreInput> {
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
    feePlan,
  ] = await Promise.all([
    // Volume mensal: BALANCE_ADJUST dos últimos 30d
    prisma.auditLog.findMany({
      where: { entityId: merchantId, action: 'BALANCE_ADJUST', createdAt: { gte: since30d } },
      select: { metadata: true },
    }),
    // Volume mês anterior: BALANCE_ADJUST de 30–60d atrás
    prisma.auditLog.findMany({
      where: { entityId: merchantId, action: 'BALANCE_ADJUST', createdAt: { gte: since60d, lt: since30d } },
      select: { metadata: true },
    }),
    // Total histórico de vendas
    prisma.auditLog.count({ where: { entityId: merchantId, action: 'BALANCE_ADJUST' } }),
    // Chargebacks no período
    prisma.auditLog.count({
      where: { entityId: merchantId, action: { in: ['CHARGEBACK_OPENED', 'DISPUTE_OPENED'] }, createdAt: { gte: since30d } },
    }),
    // MED Pix no mês corrente
    prisma.auditLog.count({
      where: { entityId: merchantId, action: { in: ['MED_PIX_REQUEST', 'FRAUD_FLAG', 'ANTIFRAUDE_FLAG'] }, createdAt: { gte: since30d } },
    }),
    // Reembolsos / estornos no período
    prisma.auditLog.count({
      where: { entityId: merchantId, action: { in: ['WITHDRAW_DENIED', 'ESTORNO', 'REEMBOLSO'] }, createdAt: { gte: since30d } },
    }),
    // Plano de taxa para estimativa de margem
    prisma.feePlan.findFirst({ where: { name: merchant.plan } }),
  ])

  function sumAmt(logs: { metadata: string | null }[]) {
    return logs.reduce((s, l) => {
      try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
    }, 0)
  }

  const volumeMensal      = sumAmt(vendas30d)
  const volumeMesAnterior = sumAmt(vendas30_60d)

  // Estimativa de margem: (taxa cobrada - custo) × volume; usa plan default quando não há FeePlan
  const chargedPct = feePlan?.chargedPercent ?? 2.5
  const costPct    = feePlan?.costPercent    ?? 1.2
  const chargedFx  = feePlan?.chargedFixed   ?? 0
  const costFx     = feePlan?.costFixed      ?? 0
  const numVendas30 = vendas30d.length || 1
  const margemEstimada = volumeMensal * ((chargedPct - costPct) / 100) + numVendas30 * (chargedFx - costFx)

  const diasDesdeCriacao = Math.max(1, Math.floor((now.getTime() - merchant.createdAt.getTime()) / 86400000))

  return {
    volumeMensal,
    volumeMesAnterior,
    totalVendas:     todasVendas,
    chargebacks,
    medPixCount:     medPix,
    reembolsos,
    saldoDisponivel: merchant.pendingBalance,
    saldoCdi:        merchant.balance,
    reservaAtual:    merchant.reservedBalance,
    diasDesdeCriacao,
    volumeFaturado:  volumeMensal,
    margemEstimada:  Math.max(0, margemEstimada),
  }
}

// ─── Persistir resultado no banco ────────────────────────────────────────────

function resultToUpsertData(r: ReturnType<typeof calcMasterScore>) {
  return {
    scoreTotal:           r.scoreTotal,
    nivelScore:           r.nivelScore,
    statusRisco:          r.statusRisco,
    volumeScore:          r.volumeScore,
    chargebackScore:      r.chargebackScore,
    medScore:             r.medScore,
    reembolsoScore:       r.reembolsoScore,
    saldoScore:           r.saldoScore,
    crescimentoScore:     r.crescimentoScore,
    tempoContaScore:      r.tempoContaScore,
    margemScore:          r.margemScore,
    observacaoInterna:    r.observacaoInterna,
    dataUltimaAtualizacao: new Date(),
  }
}

// ─── Actions públicas ─────────────────────────────────────────────────────────

/** Recalcular o score de UM seller específico */
export async function recalcSellerScore(merchantId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true, plan: true },
    })
    if (!merchant) return { ok: false, error: 'Seller não encontrado' }

    const input  = await buildScoreInput(merchantId, merchant)
    const result = calcMasterScore(input)
    const data   = resultToUpsertData(result)

    await prisma.masterScore.upsert({
      where:  { merchantId },
      create: { merchantId, ...data },
      update: data,
    })

    return { ok: true }
  } catch (err: any) {
    console.error('[recalcSellerScore]', err)
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

/** Recalcular o score de TODOS os sellers (ação do botão no Topbar) */
export async function recalcAllScores(): Promise<{ ok: boolean; updated: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, updated: 0, error: 'Não autorizado' }

  try {
    const merchants = await prisma.merchant.findMany({
      select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true, plan: true },
    })

    let updated = 0
    for (const m of merchants) {
      try {
        const input  = await buildScoreInput(m.id, m)
        const result = calcMasterScore(input)
        const data   = resultToUpsertData(result)
        await prisma.masterScore.upsert({
          where:  { merchantId: m.id },
          create: { merchantId: m.id, ...data },
          update: data,
        })
        updated++
      } catch (inner) {
        console.error(`[recalcAllScores] merchantId=${m.id}`, inner)
      }
    }

    return { ok: true, updated }
  } catch (err: any) {
    console.error('[recalcAllScores]', err)
    return { ok: false, updated: 0, error: err?.message ?? 'Erro interno' }
  }
}

/** Salvar observação interna editada manualmente pelo ADM */
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
