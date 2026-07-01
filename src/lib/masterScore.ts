/**
 * Master Score — motor de cálculo de saúde financeira dos sellers (0–100 pontos).
 *
 * O score é READ-ONLY: classifica e sugere, nunca bloqueia operações
 * nem altera saldos automaticamente.
 *
 * Composição (total máximo = 100 pontos):
 *   volumeScore      — volume mensal processado          (máx 20 pts)
 *   chargebackScore  — taxa de chargeback                (máx 25 pts)
 *   medScore         — ocorrências de MED Pix no mês     (máx 15 pts)
 *   reembolsoScore   — taxa de reembolso sobre vendas    (máx 10 pts)
 *   saldoScore       — saldo médio disponível + CDI      (máx 10 pts)
 *   crescimentoScore — variação de volume mês a mês      (máx 10 pts)
 *   tempoContaScore  — maturidade da conta em dias       (máx  5 pts)
 *   margemScore      — margem gerada para a plataforma   (máx  5 pts)
 */

export type ScoreLevel  = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante'
export type ScoreStatus = 'Alto risco' | 'Atenção' | 'Saudável' | 'Premium'

export const SCORE_MAX = {
  volume:      20,
  chargeback:  25,
  med:         15,
  reembolso:   10,
  saldo:       10,
  crescimento: 10,
  tempoConta:   5,
  margem:       5,
  total:       100,
} as const

export interface ScoreInput {
  /** Soma dos BALANCE_ADJUST nos últimos 30 dias */
  volumeMensal:      number
  /** Soma dos BALANCE_ADJUST de 30–60 dias atrás */
  volumeMesAnterior: number
  /** Total histórico de vendas (count) */
  totalVendas:       number
  /** Count de disputas CHARGEBACK_OPENED / DISPUTE_OPENED */
  chargebacks:       number
  /** Count de MED Pix no mês corrente (últimos 30d) */
  medPixCount:       number
  /** Count de estornos/reembolsos */
  reembolsos:        number
  /** pendingBalance do merchant */
  saldoDisponivel:   number
  /** balance (CDI) do merchant */
  saldoCdi:          number
  /** Reserva de risco atual */
  reservaAtual:      number
  /** Dias desde a criação do merchant */
  diasDesdeCriacao:  number
  /** Volume faturado (base para cálculo de margem) — igual ao volumeMensal quando não há dado separado */
  volumeFaturado:    number
  /** Margem estimada gerada para a plataforma (taxa cobrada - custo) */
  margemEstimada:    number
}

export interface SubScoreDetail {
  pontos:   number
  maxPontos: number
  faixa:    string   // texto da faixa aplicada
  valor:    string   // valor bruto usado (para exibir ao ADM)
}

export interface ScoreResult {
  scoreTotal:       number
  nivelScore:       ScoreLevel
  statusRisco:      ScoreStatus

  // Pontos por dimensão (soma = scoreTotal)
  volumeScore:      number
  chargebackScore:  number
  medScore:         number
  reembolsoScore:   number
  saldoScore:       number
  crescimentoScore: number
  tempoContaScore:  number
  margemScore:      number

  // Detalhes de cada dimensão (para transparência no painel)
  detalheVolume:      SubScoreDetail
  detalheChargeback:  SubScoreDetail
  detalheMed:         SubScoreDetail
  detalheReembolso:   SubScoreDetail
  detalheSaldo:       SubScoreDetail
  detalheCrescimento: SubScoreDetail
  detalheTempoConta:  SubScoreDetail
  detalheMargem:      SubScoreDetail

  observacaoInterna: string
}

// ─── Funções de cálculo por dimensão ────────────────────────────────────────

function calcVolume(volume: number): SubScoreDetail {
  const v = `R$ ${volume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (volume >= 100_000) return { pontos: 20, maxPontos: 20, faixa: 'Acima de R$ 100.000',         valor: v }
  if (volume >= 50_000)  return { pontos: 15, maxPontos: 20, faixa: 'R$ 50.000 a R$ 100.000',      valor: v }
  if (volume >= 10_000)  return { pontos: 10, maxPontos: 20, faixa: 'R$ 10.000 a R$ 50.000',       valor: v }
  if (volume > 0)        return { pontos:  5, maxPontos: 20, faixa: 'Abaixo de R$ 10.000',          valor: v }
  return                        { pontos:  0, maxPontos: 20, faixa: 'Sem volume no período',        valor: v }
}

function calcChargeback(chargebacks: number, totalVendas: number): SubScoreDetail {
  const taxa = totalVendas > 0 ? (chargebacks / totalVendas) * 100 : 0
  const v = totalVendas > 0 ? `${taxa.toFixed(2)}% (${chargebacks}/${totalVendas})` : 'Sem vendas'
  if (taxa <= 0.5)   return { pontos: 25, maxPontos: 25, faixa: '0% a 0,50%',      valor: v }
  if (taxa <= 1.0)   return { pontos: 18, maxPontos: 25, faixa: '0,51% a 1,00%',   valor: v }
  if (taxa <= 2.0)   return { pontos: 10, maxPontos: 25, faixa: '1,01% a 2,00%',   valor: v }
  return                    { pontos:  0, maxPontos: 25, faixa: 'Acima de 2%',      valor: v }
}

function calcMed(medCount: number): SubScoreDetail {
  const v = `${medCount} MED${medCount !== 1 ? 's' : ''} no mês`
  if (medCount === 0) return { pontos: 15, maxPontos: 15, faixa: 'Nenhum MED Pix',        valor: v }
  if (medCount === 1) return { pontos: 10, maxPontos: 15, faixa: '1 MED no mês',           valor: v }
  if (medCount <= 3)  return { pontos:  5, maxPontos: 15, faixa: '2 a 3 MEDs no mês',      valor: v }
  return                     { pontos:  0, maxPontos: 15, faixa: 'Acima de 3 MEDs',         valor: v }
}

function calcReembolso(reembolsos: number, totalVendas: number): SubScoreDetail {
  const taxa = totalVendas > 0 ? (reembolsos / totalVendas) * 100 : 0
  const v = totalVendas > 0 ? `${taxa.toFixed(2)}% (${reembolsos}/${totalVendas})` : 'Sem vendas'
  if (taxa <= 2.0)   return { pontos: 10, maxPontos: 10, faixa: 'Até 2%',          valor: v }
  if (taxa <= 5.0)   return { pontos:  6, maxPontos: 10, faixa: '2,01% a 5%',      valor: v }
  if (taxa <= 10.0)  return { pontos:  3, maxPontos: 10, faixa: '5,01% a 10%',     valor: v }
  return                    { pontos:  0, maxPontos: 10, faixa: 'Acima de 10%',     valor: v }
}

function calcSaldo(saldoDisponivel: number, saldoCdi: number): SubScoreDetail {
  const total = saldoDisponivel + saldoCdi
  const v = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (total >= 20_000) return { pontos: 10, maxPontos: 10, faixa: 'Saldo alto (≥ R$ 20.000)',         valor: v }
  if (total >= 5_000)  return { pontos:  6, maxPontos: 10, faixa: 'Saldo médio (R$ 5.000–R$ 20.000)', valor: v }
  if (total > 0)       return { pontos:  3, maxPontos: 10, faixa: 'Saldo baixo (< R$ 5.000)',          valor: v }
  return                      { pontos:  0, maxPontos: 10, faixa: 'Sem saldo',                         valor: v }
}

function calcCrescimento(volumeAtual: number, volumeAnterior: number): SubScoreDetail {
  let delta = 0
  let descDelta = 'Primeiro mês com volume'

  if (volumeAnterior > 0) {
    delta = ((volumeAtual - volumeAnterior) / volumeAnterior) * 100
    descDelta = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs. mês anterior`
  } else if (volumeAtual > 0) {
    descDelta = 'Primeiro mês com volume'
    return { pontos: 5, maxPontos: 10, faixa: 'Primeiro mês — estável',       valor: descDelta }
  } else {
    return { pontos: 0, maxPontos: 10, faixa: 'Sem volume',                   valor: descDelta }
  }

  if (delta >= 10)   return { pontos: 10, maxPontos: 10, faixa: 'Crescimento saudável (≥ +10%)', valor: descDelta }
  if (delta >= -5)   return { pontos:  5, maxPontos: 10, faixa: 'Estável (−5% a +10%)',           valor: descDelta }
  return                    { pontos:  0, maxPontos: 10, faixa: 'Queda forte (abaixo de −5%)',     valor: descDelta }
}

function calcTempoConta(dias: number): SubScoreDetail {
  const v = `${dias} dia${dias !== 1 ? 's' : ''} de conta`
  if (dias > 90) return { pontos: 5, maxPontos: 5, faixa: 'Acima de 90 dias', valor: v }
  if (dias >= 30) return { pontos: 3, maxPontos: 5, faixa: '30 a 90 dias',    valor: v }
  return               { pontos: 1, maxPontos: 5, faixa: 'Menos de 30 dias', valor: v }
}

function calcMargem(margemEstimada: number, volumeFaturado: number): SubScoreDetail {
  const pctMargem = volumeFaturado > 0 ? (margemEstimada / volumeFaturado) * 100 : 0
  const v = volumeFaturado > 0
    ? `R$ ${margemEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pctMargem.toFixed(2)}% do volume)`
    : 'Sem faturamento'
  if (margemEstimada >= 500 || pctMargem >= 1.5)
    return { pontos: 5, maxPontos: 5, faixa: 'Boa margem',   valor: v }
  if (margemEstimada >= 100 || pctMargem >= 0.5)
    return { pontos: 3, maxPontos: 5, faixa: 'Margem média', valor: v }
  if (margemEstimada > 0)
    return { pontos: 1, maxPontos: 5, faixa: 'Baixa margem', valor: v }
  return   { pontos: 0, maxPontos: 5, faixa: 'Sem margem',   valor: v }
}

// ─── Classificação final ─────────────────────────────────────────────────────

function resolveLevel(score: number): ScoreLevel {
  if (score >= 80) return 'Diamante'
  if (score >= 60) return 'Ouro'
  if (score >= 40) return 'Prata'
  return 'Bronze'
}

function resolveStatus(score: number): ScoreStatus {
  if (score >= 80) return 'Premium'
  if (score >= 60) return 'Saudável'
  if (score >= 40) return 'Atenção'
  return 'Alto risco'
}

function buildObservacao(r: ScoreResult): string {
  const flags: string[] = []
  if (r.chargebackScore  ===  0) flags.push('chargeback acima de 2% — crítico')
  else if (r.chargebackScore < 18) flags.push('chargeback entre 1% e 2%')
  if (r.medScore         ===  0) flags.push('mais de 3 MEDs Pix no mês')
  else if (r.medScore    <  10)  flags.push('MEDs Pix acima do aceitável')
  if (r.reembolsoScore   ===  0) flags.push('taxa de reembolso acima de 10%')
  if (r.crescimentoScore ===  0) flags.push('queda de volume superior a 5%')
  if (r.saldoScore       <=  3)  flags.push('saldo baixo')

  if (flags.length === 0) {
    if (r.scoreTotal >= 80) return 'Operação excelente. Todos os indicadores dentro do esperado.'
    return 'Operação dentro dos parâmetros. Sem alertas críticos.'
  }
  return `Atenção: ${flags.join('; ')}.`
}

// ─── Função principal ─────────────────────────────────────────────────────────

export function calcMasterScore(input: ScoreInput): ScoreResult {
  const dVolume      = calcVolume(input.volumeMensal)
  const dChargeback  = calcChargeback(input.chargebacks, input.totalVendas)
  const dMed         = calcMed(input.medPixCount)
  const dReembolso   = calcReembolso(input.reembolsos, input.totalVendas)
  const dSaldo       = calcSaldo(input.saldoDisponivel, input.saldoCdi)
  const dCrescimento = calcCrescimento(input.volumeMensal, input.volumeMesAnterior)
  const dTempoConta  = calcTempoConta(input.diasDesdeCriacao)
  const dMargem      = calcMargem(input.margemEstimada, input.volumeFaturado)

  const scoreTotal =
    dVolume.pontos + dChargeback.pontos + dMed.pontos + dReembolso.pontos +
    dSaldo.pontos  + dCrescimento.pontos + dTempoConta.pontos + dMargem.pontos

  const partial: Omit<ScoreResult, 'observacaoInterna'> = {
    scoreTotal,
    nivelScore:        resolveLevel(scoreTotal),
    statusRisco:       resolveStatus(scoreTotal),
    volumeScore:       dVolume.pontos,
    chargebackScore:   dChargeback.pontos,
    medScore:          dMed.pontos,
    reembolsoScore:    dReembolso.pontos,
    saldoScore:        dSaldo.pontos,
    crescimentoScore:  dCrescimento.pontos,
    tempoContaScore:   dTempoConta.pontos,
    margemScore:       dMargem.pontos,
    detalheVolume:      dVolume,
    detalheChargeback:  dChargeback,
    detalheMed:         dMed,
    detalheReembolso:   dReembolso,
    detalheSaldo:       dSaldo,
    detalheCrescimento: dCrescimento,
    detalheTempoConta:  dTempoConta,
    detalheMargem:      dMargem,
  }

  return { ...partial, observacaoInterna: buildObservacao(partial as ScoreResult) }
}
