export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'
import { RecalcAllButton, RecalcSellerButton } from './ScoreActions'
import type { ScoreLevel, ScoreStatus } from '@/lib/masterScore'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatBRLCompact(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`
  return `R$ ${formatBRL(v)}`
}
function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const levelMeta: Record<ScoreLevel, { color: string; bg: string; border: string; dot: string }> = {
  Diamante: { color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400' },
  Ouro:     { color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400' },
  Prata:    { color: 'text-slate-300',  bg: 'bg-slate-700/40',  border: 'border-slate-600/40',  dot: 'bg-slate-400' },
  Bronze:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-500' },
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

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100)
  const color =
    score >= 85 ? 'bg-cyan-400' :
    score >= 65 ? 'bg-emerald-400' :
    score >= 40 ? 'bg-amber-400' :
    'bg-red-400'
  const text =
    score >= 85 ? 'text-cyan-400' :
    score >= 65 ? 'text-emerald-400' :
    score >= 40 ? 'text-amber-400' :
    'text-red-400'
  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[13px] font-bold tabular-nums w-8 text-right shrink-0 ${text}`}>{score}</span>
    </div>
  )
}

function SubScoreCell({ score }: { score: number }) {
  const color =
    score >= 85 ? 'text-cyan-400' :
    score >= 65 ? 'text-emerald-400' :
    score >= 40 ? 'text-amber-400' :
    'text-red-400'
  return <span className={`text-[12px] font-semibold tabular-nums font-mono ${color}`}>{score}</span>
}

export default async function MasterScorePage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  // Buscar todos os merchants com seu score (se existir)
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

  // Separar quem tem score calculado de quem não tem
  const comScore    = merchants.filter((m: any) => m.masterScore !== null)
  const semScore    = merchants.filter((m: any) => m.masterScore === null)

  // Ordenar por scoreTotal desc
  comScore.sort((a: any, b: any) => (b.masterScore?.scoreTotal ?? 0) - (a.masterScore?.scoreTotal ?? 0))

  // Todos juntos para a tabela (sem score aparecem no final com score 0)
  const rows = [
    ...comScore,
    ...semScore.map((m: any) => ({ ...m, masterScore: null })),
  ]

  // KPIs agregados
  const scoreTotais  = comScore.map((m: any) => m.masterScore!.scoreTotal)
  const scoreMedio   = scoreTotais.length > 0
    ? Math.round(scoreTotais.reduce((s: number, v: number) => s + v, 0) / scoreTotais.length)
    : 0

  const premium    = comScore.filter((m: any) => m.masterScore?.statusRisco === 'Premium').length
  const atencao    = comScore.filter((m: any) => m.masterScore?.statusRisco === 'Atenção').length
  const altoRisco  = comScore.filter((m: any) => m.masterScore?.statusRisco === 'Alto risco').length
  const volumeTotal = merchants.reduce((s: number, m: any) => s + (m.pendingBalance ?? 0) + (m.balance ?? 0), 0)
  const reservaAtual    = merchants.reduce((s: number, m: any) => s + (m.reservedBalance ?? 0), 0)
  const reservaSugerida = 0 // será calculada via ScoreInput em runtime; aqui só exibimos o que temos

  const kpis = [
    {
      label: 'Score Médio',
      value: scoreTotais.length > 0 ? String(scoreMedio) : '—',
      sub: 'de 100 pontos',
      color: scoreMedio >= 65 ? 'text-emerald-400' : scoreMedio >= 40 ? 'text-amber-400' : 'text-red-400',
      border: 'border-slate-800/70',
    },
    {
      label: 'Sellers Premium',
      value: String(premium),
      sub: 'score ≥ 85',
      color: 'text-cyan-400',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Em Atenção',
      value: String(atencao),
      sub: 'score 40–64',
      color: 'text-amber-400',
      border: 'border-amber-500/20',
    },
    {
      label: 'Alto Risco',
      value: String(altoRisco),
      sub: 'score < 40',
      color: 'text-red-400',
      border: 'border-red-500/20',
    },
    {
      label: 'Volume Total',
      value: formatBRLCompact(volumeTotal),
      sub: `${merchants.length} sellers`,
      color: 'text-blue-400',
      border: 'border-blue-500/15',
    },
    {
      label: 'Reserva Atual',
      value: formatBRLCompact(reservaAtual),
      sub: 'bloqueado em reserva',
      color: 'text-purple-400',
      border: 'border-purple-500/15',
    },
  ]

  return (
    <div>
      <Topbar
        title="Master Score"
        breadcrumb="Casa › Risco"
        subtitle={`Saúde financeira de ${merchants.length} seller${merchants.length !== 1 ? 's' : ''} · ${comScore.length} com score calculado`}
        actions={<RecalcAllButton />}
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

        {/* Aviso se nenhum score calculado */}
        {comScore.length === 0 && merchants.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[12px] font-semibold text-amber-400">Scores ainda não calculados</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clique em <strong className="text-slate-300">Recalcular todos</strong> no topo para gerar os scores pela primeira vez.
                Após isso, cada score será atualizado automaticamente a cada evento relevante.
              </p>
            </div>
          </div>
        )}

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

        {/* Tabela */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Ranking de Sellers</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Ordenado por score total · Score 0–100 · Recálculo sob demanda ou por evento
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

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum seller cadastrado</p>
              <p className="text-[11px] text-slate-800 mt-1">Os scores serão gerados automaticamente após os primeiros cadastros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {[
                      { label: '#',                cls: 'w-10 text-center' },
                      { label: 'Seller / Empresa', cls: 'text-left' },
                      { label: 'Score Total',      cls: 'text-left min-w-[150px]' },
                      { label: 'CB',               cls: 'text-center hidden md:table-cell', title: 'Chargeback Score' },
                      { label: 'MED',              cls: 'text-center hidden md:table-cell', title: 'MED Pix Score' },
                      { label: 'Reimb.',           cls: 'text-center hidden lg:table-cell', title: 'Reembolso Score' },
                      { label: 'Vol.',             cls: 'text-center hidden lg:table-cell', title: 'Volume Score' },
                      { label: 'Saldo',            cls: 'text-center hidden xl:table-cell', title: 'Saldo Score' },
                      { label: 'Reserva',          cls: 'text-center hidden xl:table-cell', title: 'Margem/Reserva Score' },
                      { label: 'Nível',            cls: 'text-center hidden sm:table-cell' },
                      { label: 'Status',           cls: 'text-center' },
                      { label: 'Observação',       cls: 'text-left hidden xl:table-cell min-w-[180px]' },
                      { label: 'Atualizado',       cls: 'text-right hidden lg:table-cell' },
                      { label: '',                 cls: 'w-24' },
                    ].map(({ label, cls, title }) => (
                      <th key={label} title={title} className={`px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${cls}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {rows.map((m: any, i: number) => {
                    const ms = m.masterScore
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
                              <p className="text-[13px] font-semibold text-slate-200 truncate max-w-[160px]">{m.name}</p>
                              <p className="text-[11px] text-slate-600">{m.plan}</p>
                            </div>
                          </div>
                        </td>

                        {/* Score bar */}
                        <td className="px-4 py-3.5">
                          {ms ? (
                            <ScoreBar score={Math.round(ms.scoreTotal)} />
                          ) : (
                            <span className="text-[11px] text-slate-700 italic">não calculado</span>
                          )}
                        </td>

                        {/* Sub-scores */}
                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                          {ms ? <SubScoreCell score={Math.round(ms.chargebackScore)} /> : <span className="text-slate-800">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center hidden md:table-cell">
                          {ms ? <SubScoreCell score={Math.round(ms.medScore)} /> : <span className="text-slate-800">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                          {ms ? <SubScoreCell score={Math.round(ms.reembolsoScore)} /> : <span className="text-slate-800">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                          {ms ? <SubScoreCell score={Math.round(ms.volumeScore)} /> : <span className="text-slate-800">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                          {ms ? <SubScoreCell score={Math.round(ms.saldoScore)} /> : <span className="text-slate-800">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                          {ms ? <SubScoreCell score={Math.round(ms.margemScore)} /> : <span className="text-slate-800">—</span>}
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
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed line-clamp-2">
                            {ms?.observacaoInterna ?? <span className="italic text-slate-700">—</span>}
                          </p>
                        </td>

                        {/* Atualizado */}
                        <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                          <span className="text-[11px] text-slate-700">
                            {ms ? formatDate(ms.dataUltimaAtualizacao) : '—'}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 justify-end">
                            <RecalcSellerButton merchantId={m.id} />
                            <Link
                              href={`/admin/clientes/${m.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
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

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-700">
                  {rows.length} seller{rows.length !== 1 ? 's' : ''} · {comScore.length} com score calculado
                </span>
                <div className="flex items-center gap-4">
                  {(['Diamante', 'Ouro', 'Prata', 'Bronze'] as ScoreLevel[]).map((lv) => {
                    const count = comScore.filter((m: any) => m.masterScore?.nivelScore === lv).length
                    if (count === 0) return null
                    const meta = levelMeta[lv]
                    return (
                      <span key={lv} className="text-[11px] text-slate-600">
                        <span className={`font-semibold ${meta.color}`}>{count}</span> {lv}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Sub-scores explicados */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Composição do Score (pesos)</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Cada sub-score vale de 0 a 100 · Score final é a média ponderada</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 divide-x divide-y divide-slate-800/40">
            {[
              { label: 'Chargeback',  peso: 25, color: 'text-red-400',     desc: 'Taxa CB sobre vendas' },
              { label: 'MED Pix',     peso: 20, color: 'text-orange-400',  desc: 'Ocorrências de MED' },
              { label: 'Reembolso',   peso: 15, color: 'text-amber-400',   desc: 'Taxa de devoluções' },
              { label: 'Volume',      peso: 12, color: 'text-blue-400',    desc: 'Volume mensal' },
              { label: 'Reserva',     peso: 10, color: 'text-purple-400',  desc: 'Cobertura de reserva' },
              { label: 'Saldo',       peso:  8, color: 'text-slate-300',   desc: 'Disponível + CDI' },
              { label: 'Crescimento', peso:  6, color: 'text-emerald-400', desc: 'Variação mês a mês' },
              { label: 'Maturidade',  peso:  4, color: 'text-slate-400',   desc: 'Dias de conta ativa' },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3 flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-[11px] font-semibold ${item.color}`}>{item.label}</p>
                  <span className="text-[11px] font-bold text-slate-500 tabular-nums">{item.peso}%</span>
                </div>
                <p className="text-[10px] text-slate-700">{item.desc}</p>
                <div className="h-1 bg-slate-800/60 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-slate-600/60 rounded-full" style={{ width: `${item.peso * 4}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Nota de rodapé */}
        <p className="text-[11px] text-slate-700 text-center">
          O Master Score é uma ferramenta de apoio à decisão. Não bloqueia operações automaticamente nem altera saldos.
          Atualize manualmente ou aguarde o recálculo por evento (nova venda, chargeback, MED Pix, reembolso, ajuste de reserva).
        </p>

      </div>
    </div>
  )
}
