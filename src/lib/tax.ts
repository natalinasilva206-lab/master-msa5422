/**
 * Estimativa educativa de IR e IOF sobre rendimentos de renda fixa (Brasil).
 * Todos os cálculos são APROXIMADOS e de caráter informativo.
 * A tributação real pode variar conforme estrutura do produto,
 * enquadramento fiscal e legislação vigente.
 */

// IOF regressivo: % incidente sobre o rendimento, de acordo com o dia do resgate.
// Índice 0 = dia 1, índice 29 = dia 30. Após 30 dias corridos: 0%.
const IOF_RATES_BY_DAY = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66,  // dias 1–10
  63, 60, 56, 53, 50, 46, 43, 40, 36, 33,  // dias 11–20
  30, 26, 23, 20, 16, 13, 10,  6,  3,  0,  // dias 21–30
]

/** % do IOF (0–1) incidente sobre o rendimento bruto para o prazo em dias. */
export function iofRate(days: number): number {
  if (days >= 30) return 0
  const idx = Math.max(0, Math.min(days - 1, 29))
  return (IOF_RATES_BY_DAY[idx] ?? 0) / 100
}

/** Alíquota de IR (0–1) conforme tabela regressiva de renda fixa (prazo em dias). */
export function irRate(days: number): number {
  if (days <= 180) return 0.225
  if (days <= 360) return 0.20
  if (days <= 720) return 0.175
  return 0.15
}

/** Descrição textual da alíquota de IR para o prazo. */
export function irRateLabel(days: number): string {
  if (days <= 180) return '22,5% (até 180 dias)'
  if (days <= 360) return '20% (181–360 dias)'
  if (days <= 720) return '17,5% (361–720 dias)'
  return '15% (acima de 720 dias)'
}

export type TaxBreakdown = {
  grossYield:  number  // rendimento bruto
  iof:         number  // IOF estimado
  ir:          number  // IR estimado (após IOF)
  netYield:    number  // rendimento líquido
  iofRatePct:  number  // alíquota IOF em %
  irRatePct:   number  // alíquota IR em %
  days:        number
}

/**
 * Calcula estimativa de IR e IOF sobre o rendimento bruto.
 * @param grossYield  Rendimento bruto (= saldoFinal - principal)
 * @param days        Prazo em dias corridos
 */
export function calcTax(grossYield: number, days: number): TaxBreakdown {
  const iofRatePct = iofRate(days) * 100
  const iof        = grossYield * iofRate(days)
  const yieldAfterIof = grossYield - iof
  const irRatePct  = irRate(days) * 100
  const ir         = yieldAfterIof * irRate(days)
  const netYield   = yieldAfterIof - ir
  return { grossYield, iof, ir, netYield, iofRatePct, irRatePct, days }
}

/** Converte meses para dias (aproximado: 1 mês = 30 dias corridos). */
export function monthsToDays(months: number): number {
  return months * 30
}
