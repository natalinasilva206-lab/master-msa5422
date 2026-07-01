export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatBRLCompact(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`
  return `R$ ${formatBRL(v)}`
}

type ScoreLevel = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante'
type ScoreStatus = 'Alto risco' | 'Atenção' | 'Saudável' | 'Premium'

interface SellerScore {
  id: string
  name: string
  plan: string
  volumeMensal: number
  saldoMedio: number
  taxaChargeback: number
  qtdMedPix: number
  taxaReembolso: number
  reservaAtual: number
  score: number
  level: ScoreLevel
  status: ScoreStatus
  sugestao: string
}

function calcScore({
  taxaChargeback,
  qtdMedPix,
  taxaReembolso,
  volumeMensal,
  saldoMedio,
  reservaAtual,
}: {
  taxaChargeback: number
  qtdMedPix: number
  taxaReembolso: number
  volumeMensal: number
  saldoMedio: number
  reservaAtual: number
}): number {
  // Score 0–1000
  let score = 1000

  // Penalidades por chargeback (peso alto)
  if (taxaChargeback >= 2)      score -= 400
  else if (taxaChargeback >= 1) score -= 250
  else if (taxaChargeback >= 0.5) score -= 120
  else if (taxaChargeback >= 0.2) score -= 40

  // Penalidades por MED Pix
  if (qtdMedPix >= 5)  score -= 250
  else if (qtdMedPix >= 3) score -= 150
  else if (qtdMedPix >= 1) score -= 60

  // Penalidades por taxa de reembolso
  if (taxaReembolso >= 10) score -= 200
  else if (taxaReembolso >= 5) score -= 100
  else if (taxaReembolso >= 2) score -= 40

  // Bônus por volume
  if (volumeMensal >= 100_000) score += 80
  else if (volumeMensal >= 50_000) score += 40
  else if (volumeMensal >= 20_000) score += 20

  // Bônus por reserva adequada (cobertura mínima de 3% do volume)
  const reservaIdeal = volumeMensal * 0.03
  if (reservaAtual >= reservaIdeal) score += 50

  return Math.max(0, Math.min(1000, Math.round(score)))
}

function getLevel(score: number): ScoreLevel {
  if (score >= 850) return 'Diamante'
  if (score >= 650) return 'Ouro'
  if (score >= 400) return 'Prata'
  return 'Bronze'
}

function getStatus(score: number): ScoreStatus {
  if (score >= 850) return 'Premium'
  if (score >= 650) return 'Saudável'
  if (score >= 400) return 'Atenção'
  return 'Alto risco'
}

function getSugestao(score: number, taxaChargeback: number, qtdMedPix: number, taxaReembolso: number, reservaAtual: number, volumeMensal: number): string {
  if (taxaChargeback >= 1)  return 'Revisão imediata — chargeback crítico'
  if (qtdMedPix >= 5)       return 'Bloquear novas operações — excesso de MED Pix'
  if (taxaReembolso >= 10)  return 'Auditoria de reembolsos necessária'
  const reservaIdeal = volumeMensal * 0.03
  if (reservaAtual < reservaIdeal) return `Aumentar reserva para ${formatBRLCompact(reservaIdeal)}`
  if (score >= 850)         return 'Manter monitoramento — operação excelente'
  if (score >= 650)         return 'Operação saudável — acompanhar regularmente'
  return 'Monitorar de perto — indicadores em alerta'
}

const levelMeta: Record<ScoreLevel, { color: string; bg: string; border: string; dot: string }> = {
  Diamante: { color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400' },
  Ouro:     { color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400' },
  Prata:    { color: 'text-slate-300',  bg: 'bg-slate-700/40',  border: 'border-slate-600/40',  dot: 'bg-slate-400' },
  Bronze:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-500' },
}

const statusMeta: Record<ScoreStatus, { color: string; bg: string; border: string }> = {
  Premium:    { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  Saudável:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Atenção:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  'Alto risco': { color: 'text-red-400',   bg: 'bg-red-500/10',     border: 'border-red-500/20' },
}

const planDot: Record<string, string> = {
  Start:  'bg-slate-400',
  Growth: 'bg-blue-400',
  Prime:  'bg-purple-400',
  Black:  'bg-white',
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 1000) * 100
  const color =
    score >= 850 ? 'bg-cyan-400' :
    score >= 650 ? 'bg-emerald-400' :
    score >= 400 ? 'bg-amber-400' :
    'bg-red-400'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[13px] font-bold tabular-nums w-10 text-right shrink-0 ${
        score >= 850 ? 'text-cyan-400' : score >= 650 ? 'text-emerald-400' : score >= 400 ? 'text-amber-400' : 'text-red-400'
      }`}>{score}</span>
    </div>
  )
}

export default async function MasterScorePage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  // Fetch merchants + their audit logs for metric computation
  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      plan: true,
      balance: true,
      pendingBalance: true,
      reservedBalance: true,
    },
  }).catch(() => [] as any[])

  // For each merchant, get relevant audit events
  const merchantIds = merchants.map((m: any) => m.id)

  const [balanceLogs, withdrawLogs, chargebackLogs, medPixLogs] = merchantIds.length > 0
    ? await Promise.all([
        prisma.auditLog.findMany({
          where: { entityId: { in: merchantIds }, action: 'BALANCE_ADJUST' },
          select: { entityId: true, metadata: true },
        }).catch(() => []),
        prisma.auditLog.findMany({
          where: { entityId: { in: merchantIds }, action: { in: ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED'] } },
          select: { entityId: true, action: true, metadata: true },
        }).catch(() => []),
        prisma.auditLog.findMany({
          where: { entityId: { in: merchantIds }, action: { in: ['CHARGEBACK_OPENED', 'CHARGEBACK_WON', 'CHARGEBACK_LOST', 'DISPUTE_OPENED'] } },
          select: { entityId: true, action: true },
        }).catch(() => []),
        prisma.auditLog.findMany({
          where: { entityId: { in: merchantIds }, action: { in: ['MED_PIX_REQUEST', 'FRAUD_FLAG', 'ANTIFRAUDE_FLAG'] } },
          select: { entityId: true },
        }).catch(() => []),
      ])
    : [[], [], [], []]

  function getAmt(metadata: string | null) {
    try { return parseFloat(JSON.parse(metadata ?? '{}').amount || 0) } catch { return 0 }
  }

  const sellers: SellerScore[] = merchants.map((m: any) => {
    const mId = m.id

    const vendas = (balanceLogs as any[]).filter((l) => l.entityId === mId)
    const volumeMensal = vendas.reduce((s: number, l: any) => s + getAmt(l.metadata), 0)
    const saldoMedio   = ((m.balance ?? 0) + (m.pendingBalance ?? 0)) / 2
    const reservaAtual = m.reservedBalance ?? 0

    const totalVendasCount = vendas.length || 1
    const cbCount = (chargebackLogs as any[]).filter((l) => l.entityId === mId).length
    const medCount = (medPixLogs as any[]).filter((l) => l.entityId === mId).length

    // Reembolso simulado como % do volume (baseado em saques negados e proporção)
    const sacosNegados = (withdrawLogs as any[]).filter((l) => l.entityId === mId && l.action === 'WITHDRAW_REQUEST').length
    const reembolsoSim = totalVendasCount > 0 ? (sacosNegados / totalVendasCount) * 100 : 0

    const taxaChargeback = totalVendasCount > 0 ? (cbCount / totalVendasCount) * 100 : 0
    const taxaReembolso  = parseFloat(reembolsoSim.toFixed(2))

    const score   = calcScore({ taxaChargeback, qtdMedPix: medCount, taxaReembolso, volumeMensal, saldoMedio, reservaAtual })
    const level   = getLevel(score)
    const status  = getStatus(score)
    const sugestao = getSugestao(score, taxaChargeback, medCount, taxaReembolso, reservaAtual, volumeMensal)

    return {
      id: mId,
      name: m.name ?? '—',
      plan: m.plan ?? 'Start',
      volumeMensal,
      saldoMedio,
      taxaChargeback: parseFloat(taxaChargeback.toFixed(2)),
      qtdMedPix: medCount,
      taxaReembolso,
      reservaAtual,
      score,
      level,
      status,
      sugestao,
    }
  })

  sellers.sort((a, b) => b.score - a.score)

  // Aggregate KPIs
  const scoreMedio = sellers.length > 0 ? Math.round(sellers.reduce((s, x) => s + x.score, 0) / sellers.length) : 0
  const premium    = sellers.filter((s) => s.status === 'Premium').length
  const atencao    = sellers.filter((s) => s.status === 'Atenção').length
  const altoRisco  = sellers.filter((s) => s.status === 'Alto risco').length
  const volumeTotal = sellers.reduce((s, x) => s + x.volumeMensal, 0)
  const reservaTotal = sellers.reduce((s, x) => s + x.reservaAtual, 0)
  const reservaSugerida = sellers.reduce((s, x) => s + x.volumeMensal * 0.03, 0)

  const kpis = [
    {
      label: 'Score Médio',
      value: String(scoreMedio),
      sub: `de 1000 pontos`,
      color: scoreMedio >= 650 ? 'text-emerald-400' : scoreMedio >= 400 ? 'text-amber-400' : 'text-red-400',
      border: 'border-slate-800/70',
    },
    {
      label: 'Sellers Premium',
      value: String(premium),
      sub: `score ≥ 850`,
      color: 'text-cyan-400',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Em Atenção',
      value: String(atencao),
      sub: `score 400–649`,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
    },
    {
      label: 'Alto Risco',
      value: String(altoRisco),
      sub: `score < 400`,
      color: 'text-red-400',
      border: 'border-red-500/20',
    },
    {
      label: 'Volume Analisado',
      value: formatBRLCompact(volumeTotal),
      sub: `${sellers.length} sellers`,
      color: 'text-blue-400',
      border: 'border-blue-500/15',
    },
    {
      label: 'Reservas Sugeridas',
      value: formatBRLCompact(reservaSugerida),
      sub: `atual: ${formatBRLCompact(reservaTotal)}`,
      color: reservaTotal >= reservaSugerida ? 'text-emerald-400' : 'text-orange-400',
      border: reservaTotal >= reservaSugerida ? 'border-emerald-500/20' : 'border-orange-500/20',
    },
  ]

  return (
    <div>
      <Topbar
        title="Master Score"
        breadcrumb="Casa › Risco"
        subtitle={`Nota de saúde financeira e performance de ${sellers.length} seller${sellers.length !== 1 ? 's' : ''}`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpis.map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[12px] text-slate-600 mt-1.5">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 px-1">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Níveis:</p>
          {(['Diamante', 'Ouro', 'Prata', 'Bronze'] as ScoreLevel[]).map((lv) => {
            const m = levelMeta[lv]
            return (
              <div key={lv} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                <span className={`text-[12px] font-semibold ${m.color}`}>{lv}</span>
              </div>
            )
          })}
          <span className="text-slate-800 mx-1">·</span>
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Status:</p>
          {(['Premium', 'Saudável', 'Atenção', 'Alto risco'] as ScoreStatus[]).map((st) => {
            const m = statusMeta[st]
            return (
              <span key={st} className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${m.color} ${m.bg} ${m.border}`}>
                {st}
              </span>
            )
          })}
        </div>

        {/* Table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Ranking de Sellers</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Ordenado por score · Atualizado em tempo real com dados do sistema
              </p>
            </div>
            {altoRisco > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {altoRisco} alto risco
              </span>
            )}
          </div>

          {sellers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum seller cadastrado</p>
              <p className="text-[11px] text-slate-800 mt-1">O Master Score será calculado automaticamente após os primeiros cadastros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {[
                      { label: '#',               cls: 'w-10 text-center' },
                      { label: 'Seller / Empresa', cls: 'text-left' },
                      { label: 'Volume Mensal',    cls: 'text-right' },
                      { label: 'Saldo Médio',      cls: 'text-right hidden lg:table-cell' },
                      { label: 'Chargeback',       cls: 'text-right hidden md:table-cell' },
                      { label: 'MED Pix',          cls: 'text-right hidden md:table-cell' },
                      { label: 'Reembolso',        cls: 'text-right hidden xl:table-cell' },
                      { label: 'Reserva',          cls: 'text-right hidden lg:table-cell' },
                      { label: 'Score',            cls: 'text-left min-w-[160px]' },
                      { label: 'Nível',            cls: 'text-center hidden sm:table-cell' },
                      { label: 'Status',           cls: 'text-center' },
                      { label: 'Sugestão',         cls: 'text-left hidden xl:table-cell min-w-[200px]' },
                      { label: '',                 cls: 'w-16' },
                    ].map(({ label, cls }) => (
                      <th key={label} className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${cls}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {sellers.map((s, i) => {
                    const lm = levelMeta[s.level]
                    const sm = statusMeta[s.status]
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/20 transition-colors group">

                        {/* Rank */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-[12px] font-bold text-slate-600 tabular-nums">
                            {i + 1}
                          </span>
                        </td>

                        {/* Seller */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${planDot[s.plan] ?? 'bg-slate-500'}`} />
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-200 truncate max-w-[160px]">{s.name}</p>
                              <p className="text-[11px] text-slate-600">{s.plan}</p>
                            </div>
                          </div>
                        </td>

                        {/* Volume */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[13px] font-semibold text-slate-200 tabular-nums font-mono">
                            {formatBRLCompact(s.volumeMensal)}
                          </span>
                        </td>

                        {/* Saldo médio */}
                        <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                          <span className="text-[12px] text-slate-400 tabular-nums font-mono">
                            {formatBRLCompact(s.saldoMedio)}
                          </span>
                        </td>

                        {/* Chargeback */}
                        <td className="px-4 py-3.5 text-right hidden md:table-cell">
                          <span className={`text-[13px] font-semibold tabular-nums font-mono ${
                            s.taxaChargeback >= 1   ? 'text-red-400' :
                            s.taxaChargeback >= 0.5 ? 'text-amber-400' :
                            'text-slate-400'
                          }`}>
                            {s.taxaChargeback.toFixed(2)}%
                          </span>
                        </td>

                        {/* MED Pix */}
                        <td className="px-4 py-3.5 text-right hidden md:table-cell">
                          <span className={`text-[13px] font-semibold tabular-nums ${
                            s.qtdMedPix >= 5 ? 'text-red-400' :
                            s.qtdMedPix >= 2 ? 'text-amber-400' :
                            'text-slate-400'
                          }`}>
                            {s.qtdMedPix}
                          </span>
                        </td>

                        {/* Reembolso */}
                        <td className="px-4 py-3.5 text-right hidden xl:table-cell">
                          <span className={`text-[12px] font-semibold tabular-nums font-mono ${
                            s.taxaReembolso >= 5 ? 'text-amber-400' : 'text-slate-500'
                          }`}>
                            {s.taxaReembolso.toFixed(1)}%
                          </span>
                        </td>

                        {/* Reserva */}
                        <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                          <span className="text-[12px] text-slate-500 tabular-nums font-mono">
                            {formatBRLCompact(s.reservaAtual)}
                          </span>
                        </td>

                        {/* Score bar */}
                        <td className="px-4 py-3.5">
                          <ScoreBar score={s.score} />
                        </td>

                        {/* Nível */}
                        <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${lm.color} ${lm.bg} ${lm.border}`}>
                            {s.level}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                            {s.status}
                          </span>
                        </td>

                        {/* Sugestão */}
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">{s.sugestao}</p>
                        </td>

                        {/* Ação */}
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/admin/clientes/${s.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
                          >
                            Ver
                          </Link>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-700">
                  {sellers.length} seller{sellers.length !== 1 ? 's' : ''} analisado{sellers.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-4">
                  {(['Diamante', 'Ouro', 'Prata', 'Bronze'] as ScoreLevel[]).map((lv) => {
                    const count = sellers.filter((s) => s.level === lv).length
                    if (count === 0) return null
                    const m = levelMeta[lv]
                    return (
                      <span key={lv} className="text-[11px] text-slate-600">
                        <span className={`font-semibold ${m.color}`}>{count}</span> {lv}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Metodologia */}
        <section className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4">
          <p className="text-[12px] font-semibold text-blue-400 mb-2">Como o Master Score é calculado</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Taxa de Chargeback', desc: 'Peso elevado. Acima de 1% gera penalidade severa.', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'text-red-400' },
              { label: 'MED Pix',            desc: 'Mecanismo especial de devolução. 5+ = bloqueio sugerido.', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color: 'text-amber-400' },
              { label: 'Taxa de Reembolso',  desc: 'Proporção de devoluções sobre o total de vendas.', icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6', color: 'text-orange-400' },
              { label: 'Volume e Reserva',   desc: 'Bônus por volume saudável e reserva adequada (3% do volume).', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'text-emerald-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0 ${item.color}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-300">{item.label}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
