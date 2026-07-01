import { prisma } from '@/lib/prisma'

export interface RiskSuggestion {
  id:               string
  type:             'increase_reserve' | 'decrease_reserve' | 'increase_days' | 'decrease_days'
                  | 'mark_attention'  | 'mark_high_risk'   | 'mark_low_risk'
  title:            string
  reason:           string
  severity:         'info' | 'warning' | 'danger'
  suggestedPercent?: number
  suggestedDays?:   number
  suggestedLevel?:  string
}

export interface RiskMetrics {
  totalSales90d:       number  // qtd de vendas últimos 90 dias
  volumeSales90d:      number  // R$ vendas últimos 90 dias
  chargebackCount90d:  number  // qtd estornos últimos 90 dias
  chargebackVolume90d: number  // R$ estornos últimos 90 dias
  chargebackRate:      number  // % (chargebackCount / totalSales * 100)
  medCount90d:         number  // qtd MED Pix últimos 90 dias
  medVolume90d:        number  // R$ MED Pix últimos 90 dias
  medRate:             number  // % (medCount / totalSales * 100)
  reimbCount30d:       number  // qtd reembolsos últimos 30 dias
  reimbVolume30d:      number  // R$ reembolsos últimos 30 dias
  volumeLast30d:       number  // R$ vendas últimos 30 dias
  volumePrev30d:       number  // R$ vendas 30-60 dias atrás
  volumeGrowthPct:     number  // crescimento % (pode ser 0 se sem dados)
  avgTicket30d:        number  // ticket médio últimos 30 dias
  daysSinceLastDispute: number | null
  openChargebacks:     number
  openMed:             number
  accountAgeDays:      number
}

interface MerchantSnapshot {
  id:                 string
  riskReservePercent: number
  riskReleaseDays:    number
  riskLevel:          string
  riskReserveMin:     number
  riskReserveMax:     number
  reservedBalance:    number
  blockedBalance:     number
  pendingBalance:     number
  createdAt:          Date
}

export async function computeRiskMetrics(merchant: MerchantSnapshot): Promise<RiskMetrics> {
  const now    = Date.now()
  const D90    = new Date(now - 90 * 86_400_000)
  const D30    = new Date(now - 30 * 86_400_000)
  const D60    = new Date(now - 60 * 86_400_000)

  const FINISHED = ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO']

  const [saleLogs, disputes] = await Promise.all([
    prisma.saleLog.findMany({
      where:   { merchantId: merchant.id, createdAt: { gte: D90 } },
      select:  { amount: true, type: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => [] as { amount: number; type: string; status: string; createdAt: Date }[]),

    prisma.dispute.findMany({
      where:  { merchantId: merchant.id },
      select: { type: true, status: true, openedAt: true },
    }).catch(() => [] as { type: string; status: string; openedAt: Date }[]),
  ])

  const approved = saleLogs.filter((s) => s.status === 'APROVADO')

  const sales90d       = approved.filter((s) => s.type === 'VENDA')
  const chargebacks90d = approved.filter((s) => s.type === 'ESTORNO')
  const meds90d        = approved.filter((s) => s.type === 'MED_PIX')

  const sales30d    = approved.filter((s) => s.type === 'VENDA' && new Date(s.createdAt) >= D30)
  const salesPrev30 = approved.filter((s) => s.type === 'VENDA' && new Date(s.createdAt) >= D60 && new Date(s.createdAt) < D30)
  const reimb30d    = approved.filter((s) => s.type === 'REEMBOLSO' && new Date(s.createdAt) >= D30)

  const totalSales90d       = sales90d.length
  const volumeSales90d      = sales90d.reduce((a, s) => a + s.amount, 0)
  const chargebackCount90d  = chargebacks90d.length
  const chargebackVolume90d = chargebacks90d.reduce((a, s) => a + s.amount, 0)
  const medCount90d         = meds90d.length
  const medVolume90d        = meds90d.reduce((a, s) => a + s.amount, 0)
  const volumeLast30d       = sales30d.reduce((a, s) => a + s.amount, 0)
  const volumePrev30d       = salesPrev30.reduce((a, s) => a + s.amount, 0)
  const reimbCount30d       = reimb30d.length
  const reimbVolume30d      = reimb30d.reduce((a, s) => a + s.amount, 0)
  const avgTicket30d        = sales30d.length > 0 ? volumeLast30d / sales30d.length : 0
  const volumeGrowthPct     = volumePrev30d > 0 ? ((volumeLast30d - volumePrev30d) / volumePrev30d) * 100 : 0
  const chargebackRate      = totalSales90d > 0 ? (chargebackCount90d / totalSales90d) * 100 : 0
  const medRate             = totalSales90d > 0 ? (medCount90d        / totalSales90d) * 100 : 0

  const openDisputes = disputes.filter((d) => !FINISHED.includes(d.status))
  const openChargebacks = openDisputes.filter((d) => d.type === 'CHARGEBACK').length
  const openMed         = openDisputes.filter((d) => d.type === 'MED_PIX').length

  const lastDisputeTs = disputes.length > 0
    ? Math.max(...disputes.map((d) => new Date(d.openedAt).getTime()))
    : null
  const daysSinceLastDispute = lastDisputeTs !== null
    ? Math.floor((now - lastDisputeTs) / 86_400_000)
    : null

  const accountAgeDays = Math.floor((now - new Date(merchant.createdAt).getTime()) / 86_400_000)

  return {
    totalSales90d,
    volumeSales90d,
    chargebackCount90d,
    chargebackVolume90d,
    chargebackRate,
    medCount90d,
    medVolume90d,
    medRate,
    reimbCount30d,
    reimbVolume30d,
    volumeLast30d,
    volumePrev30d,
    volumeGrowthPct,
    avgTicket30d,
    daysSinceLastDispute,
    openChargebacks,
    openMed,
    accountAgeDays,
  }
}

export async function computeRiskSuggestions(merchant: MerchantSnapshot): Promise<RiskSuggestion[]> {
  const m   = await computeRiskMetrics(merchant)
  const sug: RiskSuggestion[] = []

  const capPct  = (v: number) => Math.min(v, merchant.riskReserveMax > 0 ? merchant.riskReserveMax : 50)
  const floorPct = (v: number) => Math.max(v, merchant.riskReserveMin > 0 ? merchant.riskReserveMin : 1)
  const pct = merchant.riskReservePercent

  // ── 1. Taxa de chargeback alta ──────────────────────────────────
  if (m.chargebackRate >= 2 || m.chargebackCount90d >= 3) {
    sug.push({
      id:               'cb-rate-high',
      type:             'increase_reserve',
      title:            `Taxa de chargeback: ${m.chargebackRate.toFixed(1)}% (${m.chargebackCount90d} nos últimos 90 dias)`,
      reason:           `${m.chargebackCount90d} estornos em ${m.totalSales90d} vendas nos últimos 90 dias (R$ ${m.chargebackVolume90d.toFixed(2)} em risco). Recomendamos aumentar a reserva.`,
      severity:         m.chargebackRate >= 5 ? 'danger' : 'warning',
      suggestedPercent: capPct(pct + (m.chargebackRate >= 5 ? 15 : 8)),
    })
    if (merchant.riskLevel !== 'HIGH') {
      sug.push({
        id:             'cb-rate-high-level',
        type:           'mark_high_risk',
        title:          'Marcar como Alto Risco — chargebacks elevados',
        reason:         `Taxa de ${m.chargebackRate.toFixed(1)}% justifica monitoramento intensivo.`,
        severity:       'danger',
        suggestedLevel: 'HIGH',
      })
    }
    if (merchant.riskReleaseDays < 30) {
      sug.push({
        id:            'cb-rate-days',
        type:          'increase_days',
        title:         'Aumentar prazo de liberação por chargeback',
        reason:        `Com chargebacks frequentes, manter a reserva por mais tempo protege o gateway.`,
        severity:      'warning',
        suggestedDays: Math.min(merchant.riskReleaseDays + 15, 45),
      })
    }
  } else if (m.chargebackCount90d >= 1 && merchant.riskLevel === 'LOW') {
    sug.push({
      id:             'cb-exists-level',
      type:           'mark_attention',
      title:          `${m.chargebackCount90d} chargeback(s) registrado(s) — marcar como Atenção`,
      reason:         'Existe ao menos um estorno nos últimos 90 dias. Nível MEDIUM é mais adequado.',
      severity:       'warning',
      suggestedLevel: 'MEDIUM',
    })
  }

  // ── 2. Taxa de MED Pix alta ──────────────────────────────────────
  if (m.medRate >= 1 || m.medCount90d >= 2) {
    sug.push({
      id:               'med-rate-high',
      type:             'increase_reserve',
      title:            `MED Pix: ${m.medCount90d} caso(s) nos últimos 90 dias (${m.medRate.toFixed(1)}%)`,
      reason:           `R$ ${m.medVolume90d.toFixed(2)} contestados via MED. Reserva mais alta reduz exposição.`,
      severity:         m.medRate >= 3 ? 'danger' : 'warning',
      suggestedPercent: capPct(pct + 8),
    })
    if (merchant.riskLevel === 'LOW') {
      sug.push({
        id:             'med-rate-level',
        type:           'mark_attention',
        title:          'Marcar como Atenção — MED Pix recorrente',
        reason:         'Casos de MED Pix exigem monitoramento contínuo.',
        severity:       'warning',
        suggestedLevel: 'MEDIUM',
      })
    }
  }

  // ── 3. Volume de reembolso elevado ──────────────────────────────
  if (m.reimbVolume30d > 0) {
    const reimbPct = m.volumeLast30d > 0 ? (m.reimbVolume30d / m.volumeLast30d) * 100 : 100
    if (reimbPct >= 5 || m.reimbCount30d >= 3) {
      sug.push({
        id:       'reimb-high',
        type:     'mark_attention',
        title:    `Alto volume de reembolsos — ${m.reimbCount30d} casos (R$ ${m.reimbVolume30d.toFixed(2)}) nos últimos 30 dias`,
        reason:   `${reimbPct.toFixed(1)}% do volume de vendas revertido em reembolsos. Pode indicar produto problemático.`,
        severity: reimbPct >= 15 ? 'danger' : 'warning',
        suggestedLevel: merchant.riskLevel === 'LOW' ? 'MEDIUM' : undefined,
      })
    }
  }

  // ── 4. Crescimento repentino de volume ──────────────────────────
  if (m.volumeGrowthPct >= 100 && m.volumeLast30d > 2000) {
    sug.push({
      id:               'volume-spike',
      type:             'increase_reserve',
      title:            `Volume dobrou em 30 dias (+${Math.round(m.volumeGrowthPct)}%)`,
      reason:           `Crescimento de R$ ${m.volumePrev30d.toFixed(0)} para R$ ${m.volumeLast30d.toFixed(0)} em 30 dias. Aumento repentino eleva risco de chargebacks tardios.`,
      severity:         'warning',
      suggestedPercent: capPct(pct + 5),
    })
    if (merchant.riskReleaseDays < 21) {
      sug.push({
        id:            'volume-spike-days',
        type:          'increase_days',
        title:         'Aumentar prazo de liberação com crescimento de volume',
        reason:        `Volume crescente aumenta exposição a contestações que chegam 30-90 dias após a venda.`,
        severity:      'warning',
        suggestedDays: Math.min(merchant.riskReleaseDays + 10, 30),
      })
    }
  }

  // ── 5. Ticket médio alto ────────────────────────────────────────
  if (m.avgTicket30d > 1500 && pct < 10) {
    sug.push({
      id:               'high-ticket',
      type:             'increase_reserve',
      title:            `Ticket médio alto — R$ ${m.avgTicket30d.toFixed(0)} por venda`,
      reason:           `Transações de alto valor têm maior impacto financeiro em caso de chargeback. Reserve mais para cada venda.`,
      severity:         m.avgTicket30d > 5000 ? 'danger' : 'warning',
      suggestedPercent: capPct(pct + 5),
    })
  }

  // ── 6. Conta recém-criada ───────────────────────────────────────
  if (m.accountAgeDays < 90 && pct < 15) {
    sug.push({
      id:               'new-account',
      type:             merchant.riskLevel === 'LOW' ? 'mark_attention' : 'increase_reserve',
      title:            `Conta nova — ${m.accountAgeDays} dias de cadastro`,
      reason:           'Sellers com menos de 90 dias têm histórico curto. Reserva mais alta protege até o padrão ser estabelecido.',
      severity:         'warning',
      suggestedPercent: capPct(Math.max(pct, 10)),
      suggestedLevel:   merchant.riskLevel === 'LOW' ? 'MEDIUM' : undefined,
    })
  }

  // ── 7. Saldo reservado insuficiente vs. bloqueado ───────────────
  if (merchant.blockedBalance > merchant.reservedBalance && merchant.blockedBalance > 200) {
    sug.push({
      id:               'blocked-exceeds-reserved',
      type:             'increase_reserve',
      title:            'Saldo bloqueado supera saldo reservado',
      reason:           `R$ ${merchant.blockedBalance.toFixed(2)} bloqueado vs R$ ${merchant.reservedBalance.toFixed(2)} reservado. A reserva está subdimensionada para cobrir disputas futuras.`,
      severity:         'warning',
      suggestedPercent: capPct(pct + 5),
    })
  }

  // ── 8. Disputas em aberto além da janela de 90 dias ────────────
  // openChargebacks/openMed cobrem casos antigos que não aparecem nos
  // contadores de 90 dias mas ainda estão sem resolução.
  if (m.openChargebacks > 0 && !sug.find((s) => s.id === 'cb-rate-high')) {
    sug.push({
      id:             'cb-open',
      type:           'mark_attention',
      title:          `${m.openChargebacks} chargeback${m.openChargebacks !== 1 ? 's' : ''} em aberto`,
      reason:         `${m.openChargebacks > 1 ? `${m.openChargebacks} casos` : '1 caso'} de chargeback sem resolução registrado${m.openChargebacks !== 1 ? 's' : ''}. Monitoramento necessário mesmo fora da janela de 90 dias.`,
      severity:       m.openChargebacks >= 2 ? 'danger' : 'warning',
      suggestedLevel: merchant.riskLevel === 'LOW' ? 'MEDIUM' : undefined,
    })
  }
  if (m.openMed > 0 && !sug.find((s) => s.id === 'med-rate-high')) {
    sug.push({
      id:             'med-open',
      type:           'mark_attention',
      title:          `${m.openMed} MED Pix em aberto`,
      reason:         `${m.openMed > 1 ? `${m.openMed} casos` : '1 caso'} de MED Pix sem resolução. Acompanhe o prazo de resposta junto ao banco.`,
      severity:       'warning',
      suggestedLevel: merchant.riskLevel === 'LOW' ? 'MEDIUM' : undefined,
    })
  }

  // ── 9. Seller saudável: reduzir reserva ou prazo ───────────────
  const semDisputa60 = m.daysSinceLastDispute !== null && m.daysSinceLastDispute >= 60
  const semDisputa90 = m.daysSinceLastDispute !== null && m.daysSinceLastDispute >= 90
  const semChargebackOuMed = m.chargebackCount90d === 0 && m.medCount90d === 0
  // Inclui mark_attention para evitar sugestões contraditórias
  // (ex: "alto volume de reembolsos" + "reduza a reserva" ao mesmo tempo)
  const jáTemSugestaoDeAumento = sug.some(
    (s) => s.type === 'increase_reserve' || s.type === 'mark_high_risk' || s.type === 'mark_attention'
  )

  if (!jáTemSugestaoDeAumento && semChargebackOuMed) {
    if (semDisputa90 && pct > 5) {
      sug.push({
        id:               'clean-90d-reserve',
        type:             'decrease_reserve',
        title:            `90 dias sem disputas — considere reduzir reserva`,
        reason:           `${m.daysSinceLastDispute} dias sem chargebacks, MEDs ou reembolsos. Reduzir a reserva de ${pct}% para ${floorPct(pct - 5)}% libera capital para o seller.`,
        severity:         'info',
        suggestedPercent: floorPct(pct - 5),
      })
      if (merchant.riskReleaseDays > 14) {
        sug.push({
          id:            'clean-90d-days',
          type:          'decrease_days',
          title:         'Reduzir prazo de liberação — histórico limpo',
          reason:        `Com 90 dias sem incidentes, o prazo pode ser reduzido de ${merchant.riskReleaseDays} para ${Math.max(merchant.riskReleaseDays - 7, 7)} dias.`,
          severity:      'info',
          suggestedDays: Math.max(merchant.riskReleaseDays - 7, 7),
        })
      }
      if (merchant.riskLevel === 'HIGH') {
        sug.push({
          id: 'clean-90d-level', type: 'mark_low_risk',
          title:  'Rebaixar nível de risco — 90 dias sem incidentes',
          reason: '90 dias sem disputas justificam revisão do nível de risco para MEDIUM.',
          severity: 'info', suggestedLevel: 'MEDIUM',
        })
      } else if (merchant.riskLevel === 'MEDIUM') {
        sug.push({
          id: 'clean-90d-level-low', type: 'mark_low_risk',
          title:  'Rebaixar para Baixo Risco — 90 dias sem incidentes',
          reason: 'Seller com histórico limpo pode ser reclassificado como LOW.',
          severity: 'info', suggestedLevel: 'LOW',
        })
      }
    } else if (semDisputa60 && pct > 8) {
      sug.push({
        id:               'clean-60d-reserve',
        type:             'decrease_reserve',
        title:            `60 dias sem disputas — leve redução de reserva possível`,
        reason:           `${m.daysSinceLastDispute} dias sem incidentes. Redução de ${pct}% para ${floorPct(pct - 3)}% é conservadora e razoável.`,
        severity:         'info',
        suggestedPercent: floorPct(pct - 3),
      })
    }
  }

  // ── 9. Manter reserva atual (quando tudo está OK) ──────────────
  if (sug.length === 0) {
    sug.push({
      id:       'keep-current',
      type:     'mark_low_risk',
      title:    'Perfil de risco dentro do esperado',
      reason:   `Nenhum indicador de risco elevado detectado. ${m.totalSales90d > 0 ? `${m.totalSales90d} venda(s) nos últimos 90 dias sem ocorrências.` : 'Aguarde mais histórico de transações para análise completa.'}`,
      severity: 'info',
    })
  }

  return sug
}
