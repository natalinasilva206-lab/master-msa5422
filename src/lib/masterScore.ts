/**
 * Master Score — motor de cálculo de saúde financeira dos sellers (0–100).
 *
 * O score é READ-ONLY do ponto de vista do negócio: classifica e sugere,
 * nunca bloqueia operações nem altera saldos automaticamente.
 *
 * Sub-scores (0–100 cada):
 *   volumeScore      — volume mensal processado
 *   chargebackScore  — taxa de chargeback (penalidade principal)
 *   medScore         — ocorrências de MED Pix
 *   reembolsoScore   — taxa de reembolso sobre vendas
 *   saldoScore       — saldo médio disponível + CDI
 *   crescimentoScore — tendência de volume (mês atual vs. anterior)
 *   tempoContaScore  — maturidade da conta em dias
 *   margemScore      — adequação da reserva de risco
 *
 * scoreTotal = média ponderada dos sub-scores.
 */

export type ScoreLevel  = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante'
export type ScoreStatus = 'Alto risco' | 'Atenção' | 'Saudável' | 'Premium'

export interface ScoreInput {
  // Métricas brutas derivadas dos eventos de auditoria
  volumeMensal:      number   // soma BALANCE_ADJUST últimos 30d
  volumeMesAnterior: number   // soma BALANCE_ADJUST de 30–60d atrás
  totalVendas:       number   // count de BALANCE_ADJUST total
  chargebacks:       number   // count de disputas CHARGEBACK
  medPixCount:       number   // count de MED_PIX / FRAUD_FLAG
  reembolsos:        number   // count de WITHDRAW_REQUEST negados ou estornos
  saldoDisponivel:   number   // pendingBalance
  saldoCdi:          number   // balance (CDI)
  reservaAtual:      number   // reservedBalance
  diasDesdeCriacao:  number   // hoje - merchant.createdAt em dias
}

export interface ScoreResult {
  scoreTotal:       number
  nivelScore:       ScoreLevel
  statusRisco:      ScoreStatus
  volumeScore:      number
  chargebackScore:  number
  medScore:         number
  reembolsoScore:   number
  saldoScore:       number
  crescimentoScore: number
  tempoContaScore:  number
  margemScore:      number
  observacaoInterna: string
}

// Pesos de cada sub-score (somam 100)
const WEIGHTS = {
  chargebackScore:  25,
  medScore:         20,
  reembolsoScore:   15,
  volumeScore:      12,
  margemScore:      10,
  saldoScore:        8,
  crescimentoScore:  6,
  tempoContaScore:   4,
} as const

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)))
}

function calcVolumeScore(volume: number): number {
  if (volume >= 500_000) return 100
  if (volume >= 200_000) return 90
  if (volume >= 100_000) return 80
  if (volume >= 50_000)  return 65
  if (volume >= 20_000)  return 50
  if (volume >= 5_000)   return 30
  if (volume > 0)        return 15
  return 0
}

function calcChargebackScore(chargebacks: number, totalVendas: number): number {
  if (totalVendas === 0) return 80 // sem histórico — neutro-positivo
  const taxa = (chargebacks / totalVendas) * 100
  if (taxa === 0)        return 100
  if (taxa < 0.2)        return 90
  if (taxa < 0.5)        return 70
  if (taxa < 1.0)        return 45
  if (taxa < 2.0)        return 20
  return 0
}

function calcMedScore(medCount: number): number {
  if (medCount === 0) return 100
  if (medCount === 1) return 75
  if (medCount === 2) return 50
  if (medCount === 3) return 25
  if (medCount <= 5)  return 10
  return 0
}

function calcReembolsoScore(reembolsos: number, totalVendas: number): number {
  if (totalVendas === 0) return 80
  const taxa = (reembolsos / totalVendas) * 100
  if (taxa === 0)      return 100
  if (taxa < 1)        return 90
  if (taxa < 3)        return 70
  if (taxa < 5)        return 50
  if (taxa < 10)       return 25
  return 0
}

function calcSaldoScore(saldoDisponivel: number, saldoCdi: number): number {
  const total = saldoDisponivel + saldoCdi
  if (total >= 50_000) return 100
  if (total >= 20_000) return 80
  if (total >= 5_000)  return 60
  if (total >= 1_000)  return 40
  if (total > 0)       return 20
  return 0
}

function calcCrescimentoScore(volumeAtual: number, volumeAnterior: number): number {
  if (volumeAnterior === 0 && volumeAtual === 0) return 50
  if (volumeAnterior === 0) return 70 // primeiro mês com volume
  const delta = ((volumeAtual - volumeAnterior) / volumeAnterior) * 100
  if (delta >= 30)   return 100
  if (delta >= 15)   return 85
  if (delta >= 5)    return 70
  if (delta >= 0)    return 60
  if (delta >= -10)  return 40
  if (delta >= -25)  return 20
  return 5
}

function calcTempoContaScore(dias: number): number {
  if (dias >= 365 * 2) return 100
  if (dias >= 365)     return 80
  if (dias >= 180)     return 60
  if (dias >= 90)      return 40
  if (dias >= 30)      return 20
  return 5
}

function calcMargemScore(reservaAtual: number, volumeMensal: number): number {
  if (volumeMensal === 0) return 50
  const reservaIdeal = volumeMensal * 0.03
  const cobertura = reservaAtual / reservaIdeal
  if (cobertura >= 1.5)  return 100
  if (cobertura >= 1.0)  return 85
  if (cobertura >= 0.7)  return 65
  if (cobertura >= 0.4)  return 40
  if (cobertura >= 0.1)  return 20
  return 0
}

function resolveLevel(score: number): ScoreLevel {
  if (score >= 85) return 'Diamante'
  if (score >= 65) return 'Ouro'
  if (score >= 40) return 'Prata'
  return 'Bronze'
}

function resolveStatus(score: number): ScoreStatus {
  if (score >= 85) return 'Premium'
  if (score >= 65) return 'Saudável'
  if (score >= 40) return 'Atenção'
  return 'Alto risco'
}

function buildObservacao(sub: Omit<ScoreResult, 'scoreTotal' | 'nivelScore' | 'statusRisco' | 'observacaoInterna'>, input: ScoreInput): string {
  const flags: string[] = []

  if (sub.chargebackScore < 45)  flags.push('chargeback acima do limite')
  if (sub.medScore < 50)         flags.push(`${input.medPixCount} ocorrências MED Pix`)
  if (sub.reembolsoScore < 50)   flags.push('taxa de reembolso elevada')
  if (sub.margemScore < 40)      flags.push('reserva abaixo do mínimo recomendado (3% do volume)')
  if (sub.crescimentoScore < 20) flags.push('queda significativa de volume')
  if (sub.tempoContaScore < 20)  flags.push('conta recente — histórico limitado')

  if (flags.length === 0) {
    if (sub.chargebackScore === 100 && sub.medScore === 100) return 'Operação excelente. Sem alertas.'
    return 'Operação dentro dos parâmetros esperados.'
  }

  return `Atenção: ${flags.join('; ')}.`
}

export function calcMasterScore(input: ScoreInput): ScoreResult {
  const volumeScore      = clamp(calcVolumeScore(input.volumeMensal))
  const chargebackScore  = clamp(calcChargebackScore(input.chargebacks, input.totalVendas))
  const medScore         = clamp(calcMedScore(input.medPixCount))
  const reembolsoScore   = clamp(calcReembolsoScore(input.reembolsos, input.totalVendas))
  const saldoScore       = clamp(calcSaldoScore(input.saldoDisponivel, input.saldoCdi))
  const crescimentoScore = clamp(calcCrescimentoScore(input.volumeMensal, input.volumeMesAnterior))
  const tempoContaScore  = clamp(calcTempoContaScore(input.diasDesdeCriacao))
  const margemScore      = clamp(calcMargemScore(input.reservaAtual, input.volumeMensal))

  const scoreTotal = clamp(
    (chargebackScore  * WEIGHTS.chargebackScore +
     medScore         * WEIGHTS.medScore +
     reembolsoScore   * WEIGHTS.reembolsoScore +
     volumeScore      * WEIGHTS.volumeScore +
     margemScore      * WEIGHTS.margemScore +
     saldoScore       * WEIGHTS.saldoScore +
     crescimentoScore * WEIGHTS.crescimentoScore +
     tempoContaScore  * WEIGHTS.tempoContaScore) / 100
  )

  const sub = { volumeScore, chargebackScore, medScore, reembolsoScore, saldoScore, crescimentoScore, tempoContaScore, margemScore }

  return {
    scoreTotal,
    nivelScore:        resolveLevel(scoreTotal),
    statusRisco:       resolveStatus(scoreTotal),
    observacaoInterna: buildObservacao(sub, input),
    ...sub,
  }
}
