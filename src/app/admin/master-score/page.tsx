export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'
import { RecalcAllButton, RecalcSellerButton } from './ScoreActions'
import { SCORE_MAX, type ScoreLevel, type ScoreStatus } from '@/lib/masterScore'

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtCompact(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`
  return `R$ ${fmtBRL(v)}`
}
function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

// ─── Metadados visuais ───────────────────────────────────────────────────────

const levelMeta: Record<ScoreLevel, { color: string; bg: string; border: string; dot: string; ring: string }> = {
  Diamante: { color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400',    ring: 'ring-cyan-500/20' },
  Ouro:     { color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400',   ring: 'ring-amber-500/20' },
  Prata:    { color: 'text-slate-300',  bg: 'bg-slate-700/40',  border: 'border-slate-600/40',  dot: 'bg-slate-400',   ring: 'ring-slate-600/30' },
  Bronze:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-500',  ring: 'ring-orange-500/20' },
}

const statusMeta: Record<ScoreStatus, { color: string; bg: string; border: string }> = {
  Premium:      { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20' },
  Saudável:     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Atenção:      { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  'Alto risco': { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
}

const planDot: Record<string, string> = {
  Start: 'bg-slate-400', Growth: 'bg-blue-400', Prime: 'bg-purple-400', Black: 'bg-white',
}

// Gradiente da barra de score baseado no valor
function scoreColor(score: number) {
  if (score >= 80) return { bar: 'bg-cyan-400',    text: 'text-cyan-400' }
  if (score >= 60) return { bar: 'bg-emerald-400', text: 'text-emerald-400' }
  if (score >= 40) return { bar: 'bg-amber-400',   text: 'text-amber-400' }
  return                  { bar: 'bg-red-400',      text: 'text-red-400' }
}

// ─── Componentes inline ───────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const { bar, text } = scoreColor(score)
  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[14px] font-bold tabular-nums w-8 text-right shrink-0 ${text}`}>{score}</span>
    </div>
  )
}

// Mini barra de sub-score (pontos / max)
function MiniBar({ pts, max, label }: { pts: number; max: number; label: string }) {
  const pct  = max > 0 ? (pts / max) * 100 : 0
  const { bar, text } = scoreColor(pts === max ? 100 : pts > 0 ? 60 : 0)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-600 uppercase tracking-wide font-semibold truncate">{label}</span>
        <span className={`text-[11px] font-bold tabular-nums shrink-0 ${text}`}>{pts}<span className="text-slate-700 font-normal">/{max}</span></span>
      </div>
      <div className="h-1 bg-slate-800/70 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function MasterScorePage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const merchants = await prisma.merchant.findMany({
    select: {
      id: true,
      name: true,
      plan: true,
      balance: true,
      pendingBalance: true,
      reservedBalance: true,
      masterScore: true,
    },
    orderBy: { createdAt: 'asc' },
  }).catch(() => [] as any[])

  const comScore = merchants.filter((m: any) => m.masterScore !== null)
  const semScore = merchants.filter((m: any) => m.masterScore === null)

  comScore.sort((a: any, b: any) => b.masterScore.scoreTotal - a.masterScore.scoreTotal)

  const rows = [...comScore, ...semScore.map((m: any) => ({ ...m, masterScore: null }))]

  // ── KPIs agregados ──
  const scoreTotais   = comScore.map((m: any) => Math.round(m.masterScore.scoreTotal))
  const scoreMedio    = scoreTotais.length > 0
    ? Math.round(scoreTotais.reduce((s: number, v: number) => s + v, 0) / scoreTotais.length) : 0
  const premium       = comScore.filter((m: any) => m.masterScore.statusRisco === 'Premium').length
  const saudavel      = comScore.filter((m: any) => m.masterScore.statusRisco === 'Saudável').length
  const atencao       = comScore.filter((m: any) => m.masterScore.statusRisco === 'Atenção').length
  const altoRisco     = comScore.filter((m: any) => m.masterScore.statusRisco === 'Alto risco').length
  const volumeTotal   = merchants.reduce((s: number, m: any) => s + (m.pendingBalance ?? 0) + (m.balance ?? 0), 0)
  const reservaTotal  = merchants.reduce((s: number, m: any) => s + (m.reservedBalance ?? 0), 0)

  const kpis = [
    { label: 'Score Médio',     value: scoreTotais.length ? String(scoreMedio) : '—',  sub: 'de 100 pontos',           color: scoreColor(scoreMedio).text,  border: 'border-slate-800/70' },
    { label: 'Diamante',        value: String(comScore.filter((m: any) => m.masterScore.nivelScore === 'Diamante').length), sub: 'score 80–100', color: 'text-cyan-400',    border: 'border-cyan-500/20' },
    { label: 'Sellers Premium', value: String(premium),   sub: 'score ≥ 80',          color: 'text-cyan-400',          border: 'border-cyan-500/15' },
    { label: 'Em Atenção',      value: String(atencao),   sub: 'score 40–59',          color: 'text-amber-400',         border: 'border-amber-500/20' },
    { label: 'Alto Risco',      value: String(altoRisco), sub: 'score 0–39',           color: 'text-red-400',           border: 'border-red-500/20' },
    { label: 'Volume Total',    value: fmtCompact(volumeTotal), sub: `${merchants.length} sellers`, color: 'text-blue-400', border: 'border-blue-500/15' },
    { label: 'Reserva Atual',   value: fmtCompact(reservaTotal), sub: 'bloqueado em reserva', color: 'text-purple-400', border: 'border-purple-500/15' },
  ]

  // ── Composição do score (para exibição ao ADM) ──
  const dimensoes = [
    { key: 'volumeScore',      label: 'Volume Mensal',      max: SCORE_MAX.volume,      desc: 'Volume processado nos últimos 30 dias' },
    { key: 'chargebackScore',  label: 'Chargeback',         max: SCORE_MAX.chargeback,  desc: 'Taxa de chargebacks sobre total de vendas' },
    { key: 'medScore',         label: 'MED Pix',            max: SCORE_MAX.med,         desc: 'Ocorrências de MED Pix no mês corrente' },
    { key: 'reembolsoScore',   label: 'Reembolso',          max: SCORE_MAX.reembolso,   desc: 'Taxa de reembolsos sobre total de vendas' },
    { key: 'saldoScore',       label: 'Saldo Médio',        max: SCORE_MAX.saldo,       desc: 'Disponível + saldo em CDI' },
    { key: 'crescimentoScore', label: 'Crescimento',        max: SCORE_MAX.crescimento, desc: 'Variação de volume vs. mês anterior' },
    { key: 'tempoContaScore',  label: 'Tempo de Conta',     max: SCORE_MAX.tempoConta,  desc: 'Maturidade da conta em dias' },
    { key: 'margemScore',      label: 'Margem Plataforma',  max: SCORE_MAX.margem,      desc: 'Margem estimada gerada para a plataforma' },
  ]

  return (
    <div>
      <Topbar
        title="Master Score"
        breadcrumb="Casa › Risco"
        subtitle={`Saúde financeira · ${merchants.length} seller${merchants.length !== 1 ? 's' : ''} · Score 0–100 pontos`}
        actions={<RecalcAllButton />}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {kpis.map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[12px] text-slate-600 mt-1.5">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Aviso inicial */}
        {comScore.length === 0 && merchants.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[12px] font-semibold text-amber-400">Scores ainda não calculados</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clique em <strong className="text-slate-300">Recalcular todos</strong> no topo para gerar os scores pela primeira vez.
              </p>
            </div>
          </div>
        )}

        {/* Legenda de classificação */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { range: '80–100', level: 'Diamante' as ScoreLevel, status: 'Premium' as ScoreStatus },
            { range: '60–79',  level: 'Ouro'     as ScoreLevel, status: 'Saudável' as ScoreStatus },
            { range: '40–59',  level: 'Prata'    as ScoreLevel, status: 'Atenção' as ScoreStatus },
            { range: '0–39',   level: 'Bronze'   as ScoreLevel, status: 'Alto risco' as ScoreStatus },
          ]).map(({ range, level, status }) => {
            const lm = levelMeta[level]
            const sm = statusMeta[status]
            return (
              <div key={level} className={`bg-slate-900/60 border ${lm.border} rounded-xl px-4 py-3 flex items-center gap-3`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${lm.dot}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-[13px] font-bold ${lm.color}`}>{level}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>{status}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{range} pontos</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabela principal */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Ranking de Sellers</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Ordenado por score · Clique em ↺ para recalcular individualmente
              </p>
            </div>
            {altoRisco > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {altoRisco} alto risco
              </span>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum seller cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-10 text-center">#</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left">Seller</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left min-w-[160px]">Score Total</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left min-w-[340px] hidden xl:table-cell">Composição (pts)</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center hidden sm:table-cell">Nível</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left hidden lg:table-cell">Observação</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right hidden lg:table-cell">Atualizado</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {rows.map((m: any, i: number) => {
                    const ms     = m.masterScore
                    const score  = ms ? Math.round(ms.scoreTotal) : 0
                    const level  = (ms?.nivelScore  ?? 'Bronze')     as ScoreLevel
                    const status = (ms?.statusRisco ?? 'Alto risco') as ScoreStatus
                    const lm = levelMeta[level]
                    const sm = statusMeta[status]

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">

                        {/* Rank */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-[12px] font-bold text-slate-600 tabular-nums">{i + 1}</span>
                        </td>

                        {/* Seller */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${planDot[m.plan] ?? 'bg-slate-500'}`} />
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-200 truncate max-w-[150px]">{m.name}</p>
                              <p className="text-[11px] text-slate-600">{m.plan}</p>
                            </div>
                          </div>
                        </td>

                        {/* Score bar */}
                        <td className="px-4 py-3.5">
                          {ms ? <ScoreBar score={score} /> : (
                            <span className="text-[11px] text-slate-700 italic">não calculado</span>
                          )}
                        </td>

                        {/* Composição em mini-barras */}
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          {ms ? (
                            <div className="grid grid-cols-4 gap-x-4 gap-y-2 min-w-[320px]">
                              {dimensoes.map((d) => (
                                <MiniBar
                                  key={d.key}
                                  pts={Math.round(ms[d.key] ?? 0)}
                                  max={d.max}
                                  label={d.label}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-800 text-[11px] italic">—</span>
                          )}
                        </td>

                        {/* Nível */}
                        <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${lm.color} ${lm.bg} ${lm.border}`}>
                            {level}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                            {status}
                          </span>
                        </td>

                        {/* Observação */}
                        <td className="px-4 py-3.5 hidden lg:table-cell max-w-[220px]">
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                            {ms?.observacaoInterna ?? '—'}
                          </p>
                        </td>

                        {/* Atualizado */}
                        <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                          <span className="text-[11px] text-slate-700">
                            {ms ? fmtDate(ms.dataUltimaAtualizacao) : '—'}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 justify-end">
                            <RecalcSellerButton merchantId={m.id} />
                            <Link
                              href={`/admin/clientes/${m.id}`}
                              className="inline-flex items-center px-2.5 py-1 text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
                            >
                              Ver
                            </Link>
                          </div>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-700">
                  {rows.length} seller{rows.length !== 1 ? 's' : ''} · {comScore.length} com score calculado
                </span>
                <div className="flex items-center gap-4">
                  {(['Diamante', 'Ouro', 'Prata', 'Bronze'] as ScoreLevel[]).map((lv) => {
                    const count = comScore.filter((m: any) => m.masterScore.nivelScore === lv).length
                    if (count === 0) return null
                    return (
                      <span key={lv} className="text-[11px] text-slate-600">
                        <span className={`font-semibold ${levelMeta[lv].color}`}>{count}</span> {lv}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Tabela de composição do score — transparência para o ADM */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Tabela de Pontuação</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Critérios exatos usados no cálculo do Master Score</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left">Dimensão</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right w-20">Máx.</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left">Faixas e pontuação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {[
                  {
                    label: 'Volume Mensal', max: 20,
                    faixas: [
                      { cond: 'Acima de R$ 100.000',          pts: 20 },
                      { cond: 'R$ 50.000 a R$ 100.000',       pts: 15 },
                      { cond: 'R$ 10.000 a R$ 50.000',        pts: 10 },
                      { cond: 'Abaixo de R$ 10.000',           pts:  5 },
                      { cond: 'Sem volume',                    pts:  0 },
                    ],
                  },
                  {
                    label: 'Chargeback', max: 25,
                    faixas: [
                      { cond: '0% a 0,50%',    pts: 25 },
                      { cond: '0,51% a 1,00%', pts: 18 },
                      { cond: '1,01% a 2,00%', pts: 10 },
                      { cond: 'Acima de 2%',   pts:  0 },
                    ],
                  },
                  {
                    label: 'MED Pix', max: 15,
                    faixas: [
                      { cond: 'Nenhum MED no mês',  pts: 15 },
                      { cond: '1 MED no mês',        pts: 10 },
                      { cond: '2 a 3 MEDs no mês',   pts:  5 },
                      { cond: 'Acima de 3 MEDs',      pts:  0 },
                    ],
                  },
                  {
                    label: 'Reembolso', max: 10,
                    faixas: [
                      { cond: 'Até 2%',         pts: 10 },
                      { cond: '2,01% a 5%',     pts:  6 },
                      { cond: '5,01% a 10%',    pts:  3 },
                      { cond: 'Acima de 10%',   pts:  0 },
                    ],
                  },
                  {
                    label: 'Saldo Médio', max: 10,
                    faixas: [
                      { cond: 'Saldo alto (≥ R$ 20.000)',          pts: 10 },
                      { cond: 'Saldo médio (R$ 5.000–R$ 20.000)',  pts:  6 },
                      { cond: 'Saldo baixo (< R$ 5.000)',           pts:  3 },
                      { cond: 'Sem saldo',                          pts:  0 },
                    ],
                  },
                  {
                    label: 'Crescimento Mensal', max: 10,
                    faixas: [
                      { cond: 'Crescimento ≥ +10%',          pts: 10 },
                      { cond: 'Estável (−5% a +10%)',         pts:  5 },
                      { cond: 'Primeiro mês com volume',      pts:  5 },
                      { cond: 'Queda forte (< −5%)',          pts:  0 },
                    ],
                  },
                  {
                    label: 'Tempo de Conta', max: 5,
                    faixas: [
                      { cond: 'Acima de 90 dias', pts: 5 },
                      { cond: '30 a 90 dias',     pts: 3 },
                      { cond: 'Menos de 30 dias', pts: 1 },
                    ],
                  },
                  {
                    label: 'Margem Plataforma', max: 5,
                    faixas: [
                      { cond: 'Boa margem (≥ R$ 500 ou ≥ 1,5% do volume)', pts: 5 },
                      { cond: 'Margem média (≥ R$ 100 ou ≥ 0,5%)',          pts: 3 },
                      { cond: 'Baixa margem',                                pts: 1 },
                      { cond: 'Sem margem / sem faturamento',                pts: 0 },
                    ],
                  },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-slate-800/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-[13px] font-semibold text-slate-200">{row.label}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[13px] font-bold text-blue-400 tabular-nums">{row.max}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        {row.faixas.map((f) => (
                          <span key={f.cond} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-lg">
                            {f.cond}
                            <span className={`font-bold tabular-nums ${f.pts === row.max ? 'text-emerald-400' : f.pts === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                              {f.pts} pt{f.pts !== 1 ? 's' : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Linha de total */}
                <tr className="bg-slate-800/30">
                  <td className="px-5 py-3 font-bold text-[13px] text-white">Total máximo</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[14px] font-bold text-emerald-400 tabular-nums">100</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] text-slate-500">Soma de todas as dimensões</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[11px] text-slate-700 text-center pb-2">
          O Master Score é uma ferramenta de apoio à decisão. Não bloqueia operações automaticamente nem altera saldos.
          Score recalculado sob demanda ou via evento: nova venda · chargeback · MED Pix · reembolso · ajuste de reserva.
        </p>

      </div>
    </div>
  )
}
