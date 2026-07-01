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
    vendas30dCount,
    disputas30d,
    reembolsos,
    feePlan,
  ] = await Promise.all([
    // Volume mensal: SaleLog VENDA APROVADO (fonte canônica)
    prisma.saleLog.findMany({
      where: { merchantId, type: 'VENDA', status: 'APROVADO', createdAt: { gte: since30d } },
      select: { amount: true },
    }),
    // Volume mês anterior: SaleLog VENDA APROVADO (janela 30–60d)
    prisma.saleLog.findMany({
      where: { merchantId, type: 'VENDA', status: 'APROVADO', createdAt: { gte: since60d, lt: since30d } },
      select: { amount: true },
    }),
    // Total vendas aprovadas nos últimos 30d — denominador das taxas CB/reembolso
    prisma.saleLog.count({
      where: { merchantId, type: 'VENDA', status: 'APROVADO', createdAt: { gte: since30d } },
    }),
    // Disputas: contamos todas abertas nos últimos 30d (inclusive resolvidas contra o seller)
    prisma.dispute.findMany({
      where: { merchantId, type: { in: ['CHARGEBACK', 'MED_PIX'] }, createdAt: { gte: since30d } },
      select: { type: true },
    }),
    // Reembolsos: SaleLog REEMBOLSO ou ESTORNO aprovados (fonte canônica)
    prisma.saleLog.count({
      where: { merchantId, type: { in: ['REEMBOLSO', 'ESTORNO'] }, status: 'APROVADO', createdAt: { gte: since30d } },
    }),
    // Plano de taxa para estimativa de margem
    prisma.feePlan.findFirst({ where: { name: merchant.plan } }),
  ])

  const chargebacks = disputas30d.filter(d => d.type === 'CHARGEBACK').length
  const medPix      = disputas30d.filter(d => d.type === 'MED_PIX').length

  const volumeMensal      = vendas30d.reduce((s, v) => s + v.amount, 0)
  const volumeMesAnterior = vendas30_60d.reduce((s, v) => s + v.amount, 0)

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
    totalVendas:     vendas30dCount,
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

// ─── Análise de motivos de alteração ─────────────────────────────────────────

function analisarMotivos(
  antes: { scoreTotal: number; volumeScore: number; chargebackScore: number; medScore: number; reembolsoScore: number; saldoScore: number; crescimentoScore: number; tempoContaScore: number; margemScore: number } | null,
  depois: ReturnType<typeof calcMasterScore>,
): string[] {
  if (!antes) return ['Primeiro cálculo de score para este seller']

  const motivos: string[] = []
  const delta = depois.scoreTotal - antes.scoreTotal

  const dims: Array<{ key: keyof typeof antes; label: string; dir: 'alta_ruim' | 'baixa_ruim' }> = [
    { key: 'chargebackScore',  label: 'chargeback',          dir: 'baixa_ruim' },
    { key: 'medScore',         label: 'MED Pix',             dir: 'baixa_ruim' },
    { key: 'reembolsoScore',   label: 'reembolsos',          dir: 'baixa_ruim' },
    { key: 'volumeScore',      label: 'volume mensal',       dir: 'baixa_ruim' },
    { key: 'crescimentoScore', label: 'crescimento de volume', dir: 'baixa_ruim' },
    { key: 'saldoScore',       label: 'saldo disponível',    dir: 'baixa_ruim' },
    { key: 'margemScore',      label: 'margem da plataforma', dir: 'baixa_ruim' },
    { key: 'tempoContaScore',  label: 'tempo de conta',      dir: 'baixa_ruim' },
  ]

  for (const d of dims) {
    const diff = (depois as any)[d.key] - (antes as any)[d.key]
    if (Math.abs(diff) < 1) continue
    if (diff > 0) {
      motivos.push(`melhora em ${d.label} (+${diff.toFixed(0)} pts)`)
    } else {
      motivos.push(`queda em ${d.label} (${diff.toFixed(0)} pts)`)
    }
  }

  if (motivos.length === 0) {
    if (Math.abs(delta) < 1) return ['Sem variação significativa nos indicadores']
    return [`Variação geral de ${delta > 0 ? '+' : ''}${delta.toFixed(0)} pontos`]
  }

  return motivos
}

// ─── Persistir histórico ──────────────────────────────────────────────────────

async function registrarHistorico(
  merchantId: string,
  antes: { scoreTotal: number; nivelScore: string; statusRisco: string; volumeScore: number; chargebackScore: number; medScore: number; reembolsoScore: number; saldoScore: number; crescimentoScore: number; tempoContaScore: number; margemScore: number } | null,
  depois: ReturnType<typeof calcMasterScore>,
  trigger: 'recalculo_manual' | 'recalculo_em_lote',
) {
  const motivos = analisarMotivos(antes, depois)
  await prisma.masterScoreHistory.create({
    data: {
      merchantId,
      scoreBefore:     antes?.scoreTotal      ?? 0,
      scoreAfter:      depois.scoreTotal,
      nivelBefore:     antes?.nivelScore      ?? 'Bronze',
      nivelAfter:      depois.nivelScore,
      statusBefore:    antes?.statusRisco     ?? 'Alto risco',
      statusAfter:     depois.statusRisco,
      volumeScore:     depois.volumeScore,
      chargebackScore: depois.chargebackScore,
      medScore:        depois.medScore,
      reembolsoScore:  depois.reembolsoScore,
      saldoScore:      depois.saldoScore,
      crescimentoScore: depois.crescimentoScore,
      tempoContaScore: depois.tempoContaScore,
      margemScore:     depois.margemScore,
      motivosAlteracao: JSON.stringify(motivos),
      triggerMotivo:   trigger,
    },
  })
}

// ─── Actions públicas ─────────────────────────────────────────────────────────

/** Recalcular o score de UM seller específico */
export async function recalcSellerScore(merchantId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true, plan: true },
    })
    if (!merchant) return { ok: false, error: 'Seller não encontrado' }

    const anterior = await prisma.masterScore.findUnique({ where: { merchantId } })

    const input  = await buildScoreInput(merchantId, merchant)
    const result = calcMasterScore(input)
    const data   = resultToUpsertData(result)

    await prisma.masterScore.upsert({
      where:  { merchantId },
      create: { merchantId, ...data },
      update: data,
    })

    await registrarHistorico(merchantId, anterior, result, 'recalculo_manual').catch(() => {})
    await registrarAuditControle({
      merchantId, adminEmail, adminName,
      acao: 'RECALCULO_MANUAL',
      valorAntes:  anterior ? String(anterior.scoreTotal.toFixed(0)) : null,
      valorDepois: String(result.scoreTotal.toFixed(0)),
      motivo: 'Recálculo manual solicitado pelo ADM',
    }).catch(() => {})

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

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const merchants = await prisma.merchant.findMany({
      select: { id: true, balance: true, pendingBalance: true, reservedBalance: true, createdAt: true, plan: true },
    })

    let updated = 0
    for (const m of merchants) {
      try {
        const anterior = await prisma.masterScore.findUnique({ where: { merchantId: m.id } })
        const input  = await buildScoreInput(m.id, m)
        const result = calcMasterScore(input)
        const data   = resultToUpsertData(result)
        await prisma.masterScore.upsert({
          where:  { merchantId: m.id },
          create: { merchantId: m.id, ...data },
          update: data,
        })
        await registrarHistorico(m.id, anterior, result, 'recalculo_em_lote').catch(() => {})
        await registrarAuditControle({
          merchantId: m.id, adminEmail, adminName,
          acao: 'RECALCULO_LOTE',
          valorAntes:  anterior ? String(anterior.scoreTotal.toFixed(0)) : null,
          valorDepois: String(result.scoreTotal.toFixed(0)),
          motivo: 'Recálculo em lote solicitado pelo ADM',
        }).catch(() => {})
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
export async function saveScoreObservacao(merchantId: string, observacao: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const anterior = await prisma.masterScore.findUnique({ where: { merchantId }, select: { observacaoInterna: true } })

    await prisma.masterScore.upsert({
      where:  { merchantId },
      create: { merchantId, observacaoInterna: observacao },
      update: { observacaoInterna: observacao, updatedAt: new Date() },
    })

    await prisma.masterScoreAudit.create({
      data: {
        merchantId,
        adminEmail,
        adminName,
        acao: 'OBSERVACAO',
        valorAntes:  anterior?.observacaoInterna ?? null,
        valorDepois: observacao,
        motivo,
      },
    }).catch(() => {})

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

// ─── Helper interno para auditoria de controles manuais ─────────────────────

async function registrarAuditControle(opts: {
  merchantId:  string
  adminEmail:  string
  adminName:   string
  acao:        string
  valorAntes:  string | null | undefined
  valorDepois: string | null | undefined
  motivo:      string
}) {
  await prisma.masterScoreAudit.create({
    data: {
      merchantId:  opts.merchantId,
      adminEmail:  opts.adminEmail,
      adminName:   opts.adminName,
      acao:        opts.acao,
      valorAntes:  opts.valorAntes ?? null,
      valorDepois: opts.valorDepois ?? null,
      motivo:      opts.motivo,
    },
  })
}

// ─── Helper: garante que MasterScore existe antes de atualizar campos de controle ──

async function upsertControle(merchantId: string, data: Record<string, unknown>) {
  return prisma.masterScore.upsert({
    where:  { merchantId },
    create: { merchantId, ...data },
    update: { ...data, updatedAt: new Date() },
  })
}

// ─── Controles manuais do ADM ─────────────────────────────────────────────────

/** Marcar / desmarcar seller como monitorado */
export async function setMonitorado(merchantId: string, valor: boolean, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const anterior = await prisma.masterScore.findUnique({ where: { merchantId }, select: { monitorado: true } })
    await upsertControle(merchantId, { monitorado: valor })
    await registrarAuditControle({
      merchantId, adminEmail, adminName,
      acao: 'MONITORADO',
      valorAntes:  anterior ? String(anterior.monitorado) : 'false',
      valorDepois: String(valor),
      motivo,
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

/** Marcar / desmarcar seller como estratégico */
export async function setEstrategico(merchantId: string, valor: boolean, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const anterior = await prisma.masterScore.findUnique({ where: { merchantId }, select: { estrategico: true } })
    await upsertControle(merchantId, { estrategico: valor })
    await registrarAuditControle({
      merchantId, adminEmail, adminName,
      acao: 'ESTRATEGICO',
      valorAntes:  anterior ? String(anterior.estrategico) : 'false',
      valorDepois: String(valor),
      motivo,
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

/** Alterar nível de risco manualmente (null = remover override) */
export async function setNivelManual(merchantId: string, nivel: string | null, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const anterior = await prisma.masterScore.findUnique({ where: { merchantId }, select: { nivelManual: true } })
    await upsertControle(merchantId, { nivelManual: nivel })
    await registrarAuditControle({
      merchantId, adminEmail, adminName,
      acao: 'NIVEL_MANUAL',
      valorAntes:  anterior?.nivelManual ?? 'automático',
      valorDepois: nivel ?? 'automático',
      motivo,
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

/** Congelar / descongelar benefício do seller */
export async function setBeneficioCongelado(merchantId: string, congelar: boolean, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const anterior = await prisma.masterScore.findUnique({ where: { merchantId }, select: { beneficioCongelado: true } })
    await upsertControle(merchantId, { beneficioCongelado: congelar })
    await registrarAuditControle({
      merchantId, adminEmail, adminName,
      acao: congelar ? 'BENEFICIO_CONGELADO' : 'BENEFICIO_DESCONGELADO',
      valorAntes:  anterior ? (anterior.beneficioCongelado ? 'congelado' : 'ativo') : 'ativo',
      valorDepois: congelar ? 'congelado' : 'ativo',
      motivo,
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

/** Ignorar sugestão automática */
export async function ignorarSugestaoScore(merchantId: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const anterior = await prisma.masterScore.findUnique({ where: { merchantId }, select: { sugestaoStatus: true } })
    await upsertControle(merchantId, { sugestaoStatus: 'ignorada' })
    await registrarAuditControle({
      merchantId, adminEmail, adminName,
      acao: 'SUGESTAO_IGNORADA',
      valorAntes:  anterior?.sugestaoStatus ?? 'pendente',
      valorDepois: 'ignorada',
      motivo,
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}

/** Aplicar sugestão automática (registra decisão; a aplicação real é via MasterScoreRiskBanner) */
export async function aplicarSugestaoScore(merchantId: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return { ok: false, error: 'Não autorizado' }

  const adminEmail = (session!.user as any).email ?? ''
  const adminName  = (session!.user as any).name  ?? adminEmail

  try {
    const anterior = await prisma.masterScore.findUnique({ where: { merchantId }, select: { sugestaoStatus: true } })
    await upsertControle(merchantId, { sugestaoStatus: 'aplicada' })
    await registrarAuditControle({
      merchantId, adminEmail, adminName,
      acao: 'SUGESTAO_APLICADA',
      valorAntes:  anterior?.sugestaoStatus ?? 'pendente',
      valorDepois: 'aplicada',
      motivo,
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Erro interno' }
  }
}
