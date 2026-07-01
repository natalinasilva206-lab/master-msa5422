/**
 * scoreEventHook — recálculo do Master Score disparado por eventos do sistema.
 *
 * Regras de uso:
 *   - Sempre fire-and-forget: nunca await, sempre .catch(() => {})
 *   - Nunca lança exceção para o chamador
 *   - Não requer sessão — é chamado internamente por Server Actions e crons
 *   - O score é READ-ONLY: classifica e sugere, nunca altera saldos ou reservas
 */

import { prisma } from '@/lib/prisma'
import { calcMasterScore, type ScoreInput } from '@/lib/masterScore'

// ─── Tipos de evento que disparam recálculo ───────────────────────────────────

export type ScoreEventType =
  | 'sale_approved'        // nova venda aprovada
  | 'chargeback_opened'    // chargeback / MED aberto
  | 'dispute_closed'       // disputa finalizada
  | 'refund_processed'     // reembolso / liberação de bloqueado
  | 'reserve_changed'      // alteração de reserva (config ou ajuste manual)
  | 'manual_adjustment'    // ajuste manual de saldo
  | 'cron_periodic'        // recálculo periódico

// ─── Construção do input a partir do banco ────────────────────────────────────

async function buildInput(merchantId: string, merchant: {
  balance: number
  pendingBalance: number
  reservedBalance: number
  createdAt: Date
  plan: string
}): Promise<ScoreInput> {
  const now      = new Date()
  const ms30     = 30 * 24 * 60 * 60 * 1000
  const since30d = new Date(now.getTime() - ms30)
  const since60d = new Date(now.getTime() - ms30 * 2)

  const [vendas30d, vendas30_60d, todasVendas, disputas30d, reembolsos, feePlan] =
    await Promise.all([
      prisma.auditLog.findMany({
        where: { entityId: merchantId, action: 'BALANCE_ADJUST', createdAt: { gte: since30d } },
        select: { metadata: true },
      }),
      prisma.auditLog.findMany({
        where: { entityId: merchantId, action: 'BALANCE_ADJUST', createdAt: { gte: since60d, lt: since30d } },
        select: { metadata: true },
      }),
      prisma.auditLog.count({ where: { entityId: merchantId, action: 'BALANCE_ADJUST' } }),
      // Source of truth for disputes: the Dispute table, not AuditLog
      prisma.dispute.findMany({
        where: {
          merchantId,
          status:    { notIn: ['RESOLVIDO', 'RESOLVED', 'FECHADO', 'CLOSED'] },
          createdAt: { gte: since30d },
        },
        select: { type: true },
      }),
      prisma.saleLog.count({
        where: { merchantId, type: 'REFUND', status: 'COMPLETED', createdAt: { gte: since30d } },
      }),
      prisma.feePlan.findFirst({ where: { name: merchant.plan } }),
    ])

  const chargebacks = disputas30d.filter(d => d.type === 'CHARGEBACK').length
  const medPix      = disputas30d.filter(d => ['MED', 'MED_PIX'].includes(d.type)).length

  const sumAmt = (logs: { metadata: string | null }[]) =>
    logs.reduce((s, l) => {
      try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
    }, 0)

  const volumeMensal      = sumAmt(vendas30d)
  const volumeMesAnterior = sumAmt(vendas30_60d)

  const chargedPct  = feePlan?.chargedPercent ?? 2.5
  const costPct     = feePlan?.costPercent    ?? 1.2
  const chargedFx   = feePlan?.chargedFixed   ?? 0
  const costFx      = feePlan?.costFixed      ?? 0
  const numVendas30 = vendas30d.length || 1
  const margemEstimada = volumeMensal * ((chargedPct - costPct) / 100) + numVendas30 * (chargedFx - costFx)
  const diasDesdeCriacao = Math.max(1, Math.floor((now.getTime() - merchant.createdAt.getTime()) / 86_400_000))

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

// ─── Persistência ─────────────────────────────────────────────────────────────

async function upsertScore(
  merchantId: string,
  result: ReturnType<typeof calcMasterScore>,
  triggerMotivo: string,
  anterior: { scoreTotal: number; nivelScore: string; statusRisco: string; volumeScore: number; chargebackScore: number; medScore: number; reembolsoScore: number; saldoScore: number; crescimentoScore: number; tempoContaScore: number; margemScore: number } | null,
) {
  const data = {
    scoreTotal:           result.scoreTotal,
    nivelScore:           result.nivelScore,
    statusRisco:          result.statusRisco,
    volumeScore:          result.volumeScore,
    chargebackScore:      result.chargebackScore,
    medScore:             result.medScore,
    reembolsoScore:       result.reembolsoScore,
    saldoScore:           result.saldoScore,
    crescimentoScore:     result.crescimentoScore,
    tempoContaScore:      result.tempoContaScore,
    margemScore:          result.margemScore,
    observacaoInterna:    result.observacaoInterna,
    dataUltimaAtualizacao: new Date(),
  }

  await prisma.masterScore.upsert({
    where:  { merchantId },
    create: { merchantId, ...data },
    update: data,
  })

  // Registra histórico de alteração
  const deltaScore = Math.abs(result.scoreTotal - (anterior?.scoreTotal ?? 0))
  const nivelMudou = anterior && anterior.nivelScore !== result.nivelScore

  if (!anterior || deltaScore >= 1 || nivelMudou) {
    const motivos = buildMotivos(anterior, result)
    await prisma.masterScoreHistory.create({
      data: {
        merchantId,
        scoreBefore:     anterior?.scoreTotal      ?? 0,
        scoreAfter:      result.scoreTotal,
        nivelBefore:     anterior?.nivelScore      ?? 'Bronze',
        nivelAfter:      result.nivelScore,
        statusBefore:    anterior?.statusRisco     ?? 'Alto risco',
        statusAfter:     result.statusRisco,
        volumeScore:     result.volumeScore,
        chargebackScore: result.chargebackScore,
        medScore:        result.medScore,
        reembolsoScore:  result.reembolsoScore,
        saldoScore:      result.saldoScore,
        crescimentoScore: result.crescimentoScore,
        tempoContaScore: result.tempoContaScore,
        margemScore:     result.margemScore,
        motivosAlteracao: JSON.stringify(motivos),
        triggerMotivo,
      },
    }).catch(() => {})
  }
}

function buildMotivos(
  antes: { scoreTotal: number; volumeScore: number; chargebackScore: number; medScore: number; reembolsoScore: number; saldoScore: number; crescimentoScore: number; tempoContaScore: number; margemScore: number } | null,
  depois: ReturnType<typeof calcMasterScore>,
): string[] {
  if (!antes) return ['Primeiro cálculo de score para este seller']

  const motivos: string[] = []
  const dims = [
    { key: 'chargebackScore',  label: 'chargeback' },
    { key: 'medScore',         label: 'MED Pix' },
    { key: 'reembolsoScore',   label: 'reembolsos' },
    { key: 'volumeScore',      label: 'volume mensal' },
    { key: 'crescimentoScore', label: 'crescimento de volume' },
    { key: 'saldoScore',       label: 'saldo disponível' },
    { key: 'margemScore',      label: 'margem da plataforma' },
    { key: 'tempoContaScore',  label: 'tempo de conta' },
  ] as const

  for (const d of dims) {
    const diff = (depois as any)[d.key] - (antes as any)[d.key]
    if (Math.abs(diff) < 1) continue
    motivos.push(diff > 0
      ? `melhora em ${d.label} (+${diff.toFixed(0)} pts)`
      : `queda em ${d.label} (${diff.toFixed(0)} pts)`)
  }

  if (motivos.length === 0) {
    const delta = depois.scoreTotal - antes.scoreTotal
    if (Math.abs(delta) < 1) return ['Sem variação significativa']
    return [`Variação de ${delta > 0 ? '+' : ''}${delta.toFixed(0)} pontos`]
  }
  return motivos
}

// ─── Função interna de recálculo (sem auth) ───────────────────────────────────

async function _recalc(merchantId: string, triggerMotivo: string): Promise<void> {
  const merchant = await prisma.merchant.findUnique({
    where:  { id: merchantId },
    select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true, plan: true },
  })
  if (!merchant) return

  const anterior = await prisma.masterScore.findUnique({ where: { merchantId } })
  const input    = await buildInput(merchantId, merchant)
  const result   = calcMasterScore(input)
  await upsertScore(merchantId, result, triggerMotivo, anterior)
}

// ─── API pública — always fire-and-forget ────────────────────────────────────

/**
 * Agenda o recálculo do score de um seller após um evento relevante.
 * Nunca lança — chame sem await.
 */
export function scheduleScoreRecalc(merchantId: string, event: ScoreEventType = 'manual_adjustment'): void {
  _recalc(merchantId, event).catch(() => {})
}

/**
 * Recalcula o score de todos os sellers de forma síncrona.
 * Usado pelo cron periódico — retorna contagem de atualizados.
 */
export async function recalcAllScoresInternal(): Promise<{ updated: number; errors: number }> {
  const merchants = await prisma.merchant.findMany({
    select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true, plan: true },
  })

  let updated = 0
  let errors  = 0
  for (const m of merchants) {
    try {
      const anterior = await prisma.masterScore.findUnique({ where: { merchantId: m.id } })
      const input    = await buildInput(m.id, m)
      const result   = calcMasterScore(input)
      await upsertScore(m.id, result, 'cron_periodic', anterior)
      updated++
    } catch {
      errors++
    }
  }
  return { updated, errors }
}
