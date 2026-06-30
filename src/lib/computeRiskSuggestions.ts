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

export async function computeRiskSuggestions(merchant: MerchantSnapshot): Promise<RiskSuggestion[]> {
  const suggestions: RiskSuggestion[] = []
  const now = Date.now()

  const FINISHED = ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO']

  const disputes = await prisma.dispute.findMany({
    where: { merchantId: merchant.id },
    select: { type: true, status: true, openedAt: true, contestedAmount: true },
  }).catch(() => [] as { type: string; status: string; openedAt: Date; contestedAmount: number }[])

  const openDisputes    = disputes.filter((d) => !FINISHED.includes(d.status))
  const openChargebacks = openDisputes.filter((d) => d.type === 'CHARGEBACK')
  const openMed         = openDisputes.filter((d) => d.type === 'MED_PIX')
  const openReimbursements = openDisputes.filter((d) => d.type === 'REEMBOLSO')

  // Days since last dispute (of any kind)
  const lastDisputeDate = disputes.length > 0
    ? Math.max(...disputes.map((d) => new Date(d.openedAt).getTime()))
    : null
  const daysSinceLastDispute = lastDisputeDate
    ? Math.floor((now - lastDisputeDate) / 86_400_000)
    : null

  // Account age in days
  const accountAgeDays = Math.floor((now - new Date(merchant.createdAt).getTime()) / 86_400_000)

  // ── Chargeback / MED: increase reserve & risk level ──────────────
  if (openChargebacks.length >= 2) {
    const suggestedPct = Math.min(merchant.riskReservePercent + 10, merchant.riskReserveMax || 50)
    suggestions.push({
      id:               'cb-increase-reserve',
      type:             'increase_reserve',
      title:            `Aumentar reserva — ${openChargebacks.length} chargebacks em aberto`,
      reason:           `O seller possui ${openChargebacks.length} chargebacks abertos. Recomendamos elevar a reserva de ${merchant.riskReservePercent}% para ${suggestedPct}% para cobrir riscos.`,
      severity:         'danger',
      suggestedPercent: suggestedPct,
    })
    if (merchant.riskLevel !== 'HIGH') {
      suggestions.push({
        id:             'cb-mark-high-risk',
        type:           'mark_high_risk',
        title:          'Marcar seller como Alto Risco',
        reason:         `Múltiplos chargebacks em aberto justificam nível HIGH para monitoramento intensificado.`,
        severity:       'danger',
        suggestedLevel: 'HIGH',
      })
    }
  } else if (openChargebacks.length === 1) {
    const suggestedPct = Math.min(merchant.riskReservePercent + 5, merchant.riskReserveMax || 50)
    suggestions.push({
      id:               'cb-increase-reserve-1',
      type:             'increase_reserve',
      title:            'Aumentar reserva — chargeback em aberto',
      reason:           `Há 1 chargeback em aberto. Considere elevar a reserva de ${merchant.riskReservePercent}% para ${suggestedPct}%.`,
      severity:         'warning',
      suggestedPercent: suggestedPct,
    })
    if (merchant.riskLevel === 'LOW') {
      suggestions.push({
        id:             'cb-mark-attention',
        type:           'mark_attention',
        title:          'Marcar seller como Atenção',
        reason:         'Chargeback aberto requer monitoramento. Nível MEDIUM é mais adequado.',
        severity:       'warning',
        suggestedLevel: 'MEDIUM',
      })
    }
  }

  if (openMed.length >= 2) {
    const suggestedPct = Math.min(merchant.riskReservePercent + 8, merchant.riskReserveMax || 50)
    suggestions.push({
      id:               'med-increase-reserve',
      type:             'increase_reserve',
      title:            `Aumentar reserva — ${openMed.length} MED Pix em aberto`,
      reason:           `${openMed.length} casos de MED Pix abertos. Recomendamos elevar a reserva de ${merchant.riskReservePercent}% para ${suggestedPct}%.`,
      severity:         'danger',
      suggestedPercent: suggestedPct,
    })
  } else if (openMed.length === 1 && merchant.riskLevel === 'LOW') {
    suggestions.push({
      id:             'med-mark-attention',
      type:           'mark_attention',
      title:          'Marcar seller como Atenção — MED Pix aberto',
      reason:         'Há 1 caso de MED Pix aberto. Acompanhe de perto.',
      severity:       'warning',
      suggestedLevel: 'MEDIUM',
    })
  }

  // ── Reembolsos frequentes ─────────────────────────────────────────
  if (openReimbursements.length >= 3) {
    suggestions.push({
      id:       'reimb-attention',
      type:     'mark_attention',
      title:    `${openReimbursements.length} reembolsos em aberto`,
      reason:   'Volume elevado de reembolsos pode indicar produtos com alto índice de insatisfação.',
      severity: 'warning',
    })
  }

  // ── 60-90 dias sem disputa: reduzir reserva ───────────────────────
  if (daysSinceLastDispute !== null && daysSinceLastDispute >= 90 && merchant.riskReservePercent > 5) {
    const suggestedPct = Math.max(merchant.riskReservePercent - 5, merchant.riskReserveMin || 3)
    suggestions.push({
      id:               'no-dispute-90d-reserve',
      type:             'decrease_reserve',
      title:            '90 dias sem disputa — considere reduzir reserva',
      reason:           `Seller sem disputas há ${daysSinceLastDispute} dias. Reduzir a reserva de ${merchant.riskReservePercent}% para ${suggestedPct}% libera capital para o seller.`,
      severity:         'info',
      suggestedPercent: suggestedPct,
    })
    if (merchant.riskReleaseDays > 14) {
      suggestions.push({
        id:            'no-dispute-90d-days',
        type:          'decrease_days',
        title:         'Reduzir prazo de liberação',
        reason:        `Com 90 dias sem incidentes, o prazo pode ser reduzido de ${merchant.riskReleaseDays} para ${Math.max(merchant.riskReleaseDays - 7, 7)} dias.`,
        severity:      'info',
        suggestedDays: Math.max(merchant.riskReleaseDays - 7, 7),
      })
    }
    if (merchant.riskLevel === 'HIGH') {
      suggestions.push({
        id:             'no-dispute-90d-level',
        type:           'mark_low_risk',
        title:          'Rebaixar nível de risco para Médio',
        reason:         '90 dias sem disputas justificam revisão do nível de risco.',
        severity:       'info',
        suggestedLevel: 'MEDIUM',
      })
    } else if (merchant.riskLevel === 'MEDIUM') {
      suggestions.push({
        id:             'no-dispute-90d-level-low',
        type:           'mark_low_risk',
        title:          'Rebaixar nível de risco para Baixo',
        reason:         '90 dias sem disputas e nível MEDIUM — pode ser rebaixado para LOW.',
        severity:       'info',
        suggestedLevel: 'LOW',
      })
    }
  } else if (daysSinceLastDispute !== null && daysSinceLastDispute >= 60 && merchant.riskReservePercent > 10) {
    const suggestedPct = Math.max(merchant.riskReservePercent - 3, merchant.riskReserveMin || 3)
    suggestions.push({
      id:               'no-dispute-60d-reserve',
      type:             'decrease_reserve',
      title:            '60 dias sem disputa — leve redução de reserva',
      reason:           `${daysSinceLastDispute} dias sem incidentes. Redução pequena de ${merchant.riskReservePercent}% para ${suggestedPct}% é possível.`,
      severity:         'info',
      suggestedPercent: suggestedPct,
    })
  }

  // ── Conta nova (< 90 dias) ─────────────────────────────────────
  if (accountAgeDays < 90 && merchant.riskReservePercent < 10) {
    suggestions.push({
      id:               'new-account',
      type:             'mark_attention',
      title:            `Conta nova — ${accountAgeDays} dias de cadastro`,
      reason:           'Sellers com menos de 90 dias devem ser monitorados com atenção. Considere manter reserva mais alta até o histórico se consolidar.',
      severity:         'warning',
      suggestedLevel:   merchant.riskLevel === 'LOW' ? 'MEDIUM' : undefined,
    })
  }

  // ── Saldo reservado insuficiente vs. bloqueado ─────────────────
  if (merchant.blockedBalance > merchant.reservedBalance && merchant.blockedBalance > 100) {
    suggestions.push({
      id:               'blocked-exceeds-reserved',
      type:             'increase_reserve',
      title:            'Saldo bloqueado supera saldo reservado',
      reason:           `R$ ${merchant.blockedBalance.toFixed(2)} bloqueado vs R$ ${merchant.reservedBalance.toFixed(2)} reservado. A reserva pode estar subdimensionada.`,
      severity:         'warning',
      suggestedPercent: Math.min(merchant.riskReservePercent + 5, merchant.riskReserveMax || 50),
    })
  }

  return suggestions
}
