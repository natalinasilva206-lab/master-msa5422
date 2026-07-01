export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import SellerTabs from '../SellerTabs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SCORE_MAX, type ScoreLevel, type ScoreStatus } from '@/lib/masterScore'

interface PageProps {
  params: { id: string }
  searchParams: { periodo?: string }
}

// ─── Formatadores ─────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

function fmtDateShort(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short',
  }).format(new Date(d))
}

// ─── Metadados visuais ─────────────────────────────────────────────────────────

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

function scoreColor(score: number) {
  if (score >= 80) return { bar: 'bg-cyan-400',    text: 'text-cyan-400',    fill: '#22d3ee' }
  if (score >= 60) return { bar: 'bg-emerald-400', text: 'text-emerald-400', fill: '#34d399' }
  if (score >= 40) return { bar: 'bg-amber-400',   text: 'text-amber-400',   fill: '#fbbf24' }
  return                  { bar: 'bg-red-400',      text: 'text-red-400',     fill: '#f87171' }
}

// ─── Dimensões do score ────────────────────────────────────────────────────────

const DIMS = [
  { key: 'volumeScore',      label: 'Volume',      max: SCORE_MAX.volume },
  { key: 'chargebackScore',  label: 'Chargeback',  max: SCORE_MAX.chargeback },
  { key: 'medScore',         label: 'MED Pix',     max: SCORE_MAX.med },
  { key: 'reembolsoScore',   label: 'Reembolso',   max: SCORE_MAX.reembolso },
  { key: 'saldoScore',       label: 'Saldo',       max: SCORE_MAX.saldo },
  { key: 'crescimentoScore', label: 'Crescimento', max: SCORE_MAX.crescimento },
  { key: 'tempoContaScore',  label: 'Tempo',       max: SCORE_MAX.tempoConta },
  { key: 'margemScore',      label: 'Margem',      max: SCORE_MAX.margem },
] as const

// ─── Página ────────────────────────────────────────────────────────────────────

export default async function ScoreHistoricoPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const merchant = await prisma.merchant.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, plan: true, masterScore: true },
  })
  if (!merchant) notFound()

  const periodo = searchParams.periodo ?? '30'
  const dias    = periodo === '7' ? 7 : periodo === '90' ? 90 : 30
  const since   = new Date(Date.now() - dias * 86_400_000)

  const historico = await prisma.masterScoreHistory.findMany({
    where:   { merchantId: merchant.id, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
  })

  const ms = merchant.masterScore

  // ── KPIs ──
  const primeiro   = historico[0]
  const ultimo     = historico[historico.length - 1]
  const deltaScore = historico.length >= 2
    ? (ultimo?.scoreAfter ?? 0) - (primeiro?.scoreBefore ?? 0)
    : 0
  const mudancasNivel = historico.filter((h) => h.nivelBefore !== h.nivelAfter).length

  // ── Dados para o gráfico de barras (máx 30 pontos visíveis) ──
  const chartData = historico.slice(-30).map((h) => ({
    score: Math.round(h.scoreAfter),
    label: fmtDateShort(h.createdAt),
    data:  h.createdAt,
  }))

  // ── Períodos disponíveis ──
  const periodos = [
    { label: '7 dias',  value: '7' },
    { label: '30 dias', value: '30' },
    { label: '90 dias', value: '90' },
  ]

  return (
    <div>
      <Topbar
        title={merchant.name}
        breadcrumb={`Casa › Clientes › ${merchant.name}`}
        subtitle={`Histórico do Score · Plano ${merchant.plan}`}
      />

      <div className="p-4 xl:p-6 space-y-4">
        <SellerTabs merchantId={merchant.id} />

        {/* ── Cabeçalho + filtro de período ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-white">Evolução do Master Score</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {historico.length} registro{historico.length !== 1 ? 's' : ''} nos últimos {dias} dias
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/70 rounded-lg p-1">
            {periodos.map((p) => (
              <Link
                key={p.value}
                href={`?periodo=${p.value}`}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                  periodo === p.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Score Atual',
              value: ms ? String(Math.round(ms.scoreTotal)) : '—',
              sub:   ms ? `${ms.nivelScore} · ${ms.statusRisco}` : 'Não calculado',
              color: ms ? scoreColor(ms.scoreTotal).text : 'text-slate-500',
            },
            {
              label: 'Variação no Período',
              value: historico.length >= 2 ? `${deltaScore >= 0 ? '+' : ''}${deltaScore.toFixed(0)}` : '—',
              sub:   historico.length >= 2 ? `de ${primeiro?.scoreBefore.toFixed(0)} para ${ultimo?.scoreAfter.toFixed(0)} pts` : 'sem dados suficientes',
              color: deltaScore > 0 ? 'text-emerald-400' : deltaScore < 0 ? 'text-red-400' : 'text-slate-400',
            },
            {
              label: 'Recálculos',
              value: String(historico.length),
              sub:   `nos últimos ${dias} dias`,
              color: 'text-blue-400',
            },
            {
              label: 'Mudanças de Nível',
              value: String(mudancasNivel),
              sub:   mudancasNivel > 0 ? 'alterações de classificação' : 'nível estável no período',
              color: mudancasNivel > 0 ? 'text-amber-400' : 'text-slate-400',
            },
          ].map((k) => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{k.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${k.color}`}>{k.value}</p>
              <p className="text-[12px] text-slate-600 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Gráfico de barras (SVG puro) ── */}
        {chartData.length > 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Gráfico de Evolução</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Score por recálculo (últimos {Math.min(chartData.length, 30)} registros)</p>
            </div>
            <div className="px-5 py-4">
              {/* Linhas de referência */}
              <div className="relative">
                {/* Grade de fundo */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: 28 }}>
                  {[100, 80, 60, 40, 20, 0].map((v) => (
                    <div key={v} className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-700 w-5 text-right shrink-0">{v}</span>
                      <div className="flex-1 border-t border-slate-800/50 border-dashed" />
                    </div>
                  ))}
                </div>
                {/* Barras */}
                <div className="flex items-end gap-1 ml-7" style={{ height: 160 }}>
                  {chartData.map((d, i) => {
                    const { bar, text, fill } = scoreColor(d.score)
                    const heightPct = Math.max(2, (d.score / 100) * 100)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group min-w-0">
                        <div className="relative flex flex-col items-center w-full">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            <div className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1">
                              <span className={`text-[10px] font-bold ${text}`}>{d.score} pts</span>
                            </div>
                          </div>
                          <div
                            className={`w-full rounded-t ${bar} opacity-80 group-hover:opacity-100 transition-opacity`}
                            style={{ height: `${(heightPct / 100) * 140}px` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Labels do eixo X (apenas alguns para não sobrecarregar) */}
                <div className="flex gap-1 ml-7 mt-1">
                  {chartData.map((d, i) => {
                    const show = chartData.length <= 10 || i === 0 || i === chartData.length - 1 || i % Math.ceil(chartData.length / 8) === 0
                    return (
                      <div key={i} className="flex-1 min-w-0 text-center">
                        {show && (
                          <p className="text-[8.5px] text-slate-700 truncate">{d.label}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-800/40">
                {[
                  { label: 'Diamante (80–100)', color: 'bg-cyan-400' },
                  { label: 'Ouro (60–79)',       color: 'bg-emerald-400' },
                  { label: 'Prata (40–59)',      color: 'bg-amber-400' },
                  { label: 'Bronze (0–39)',       color: 'bg-red-400' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                    <span className="text-[10px] text-slate-600">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Timeline detalhada ── */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Timeline de Alterações</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Cada recálculo com motivos e indicadores</p>
            </div>
            <Link
              href={`/admin/master-score/${merchant.id}`}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ver score completo →
            </Link>
          </div>

          {historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-[13px] font-semibold text-slate-600">Sem histórico neste período</p>
              <p className="text-[11px] text-slate-700 mt-1 text-center max-w-xs">
                Recalcule o score do seller para gerar o primeiro registro de histórico.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {[...historico].reverse().map((h, i) => {
                const delta      = h.scoreAfter - h.scoreBefore
                const levelAfter = h.nivelAfter as ScoreLevel
                const lm         = levelMeta[levelAfter] ?? levelMeta['Bronze']
                const statusAfter = h.statusAfter as ScoreStatus
                const sm          = statusMeta[statusAfter] ?? statusMeta['Alto risco']
                const sc          = scoreColor(h.scoreAfter)
                const mudouNivel  = h.nivelBefore !== h.nivelAfter
                const motivos: string[] = (() => {
                  try { return JSON.parse(h.motivosAlteracao) } catch { return [] }
                })()

                return (
                  <details
                    key={h.id}
                    className="group"
                    open={i === 0}
                  >
                    <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-800/15 transition-colors list-none">

                      {/* Score badge */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${lm.border} ${lm.bg}`}>
                        <span className={`text-[16px] font-black tabular-nums ${sc.text}`}>
                          {Math.round(h.scoreAfter)}
                        </span>
                      </div>

                      {/* Delta + info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {/* Delta score */}
                          <span className={`text-[13px] font-bold tabular-nums ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta).toFixed(0)} pts
                          </span>
                          {/* Antes → depois */}
                          <span className="text-[11px] text-slate-600">
                            {h.scoreBefore.toFixed(0)} → {h.scoreAfter.toFixed(0)}
                          </span>
                          {/* Mudança de nível */}
                          {mudouNivel && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${lm.border} ${lm.color} ${lm.bg}`}>
                              {h.nivelBefore} → {h.nivelAfter}
                            </span>
                          )}
                          {/* Nível atual */}
                          {!mudouNivel && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${lm.border} ${lm.color}`}>
                              {h.nivelAfter}
                            </span>
                          )}
                          {/* Status */}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sm.border} ${sm.color} ${sm.bg}`}>
                            {h.statusAfter}
                          </span>
                          {/* Trigger */}
                          <span className="text-[9.5px] font-medium text-slate-700 uppercase tracking-wider">
                            {h.triggerMotivo === 'recalculo_em_lote' ? 'em lote' : 'manual'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{fmtDate(h.createdAt)}</p>
                      </div>

                      {/* Chevron */}
                      <svg className="w-4 h-4 text-slate-600 shrink-0 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>

                    {/* Detalhes expandidos */}
                    <div className="px-5 pb-5 pt-1 space-y-4 bg-slate-900/20">

                      {/* Motivos */}
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Motivos da Alteração</p>
                        <div className="space-y-1.5">
                          {motivos.map((m, mi) => {
                            const isPositivo = m.includes('melhora')
                            const isNeutro   = m.includes('Sem variação') || m.includes('Primeiro cálculo')
                            const icon = isNeutro
                              ? { d: 'M20 12H4', color: 'text-slate-500', bg: 'bg-slate-700/40' }
                              : isPositivo
                              ? { d: 'M5 13l4 4L19 7', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                              : { d: 'M6 18L18 6M6 6l12 12', color: 'text-red-400', bg: 'bg-red-500/10' }
                            return (
                              <div key={mi} className="flex items-start gap-2.5">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${icon.bg}`}>
                                  <svg className={`w-2.5 h-2.5 ${icon.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={icon.d} />
                                  </svg>
                                </div>
                                <p className="text-[11.5px] text-slate-400 leading-snug capitalize">{m}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Composição dos sub-scores após o recálculo */}
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Composição neste Recálculo</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {DIMS.map((d) => {
                            const pts = Math.round((h as any)[d.key] ?? 0)
                            const pct = d.max > 0 ? (pts / d.max) * 100 : 0
                            const { bar, text } = scoreColor(pts === d.max ? 100 : pts > 0 ? 60 : 0)
                            return (
                              <div key={d.key} className="bg-slate-900/50 border border-slate-800/60 rounded-lg p-2.5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-wider">{d.label}</p>
                                  <p className={`text-[11px] font-bold tabular-nums ${text}`}>
                                    {pts}<span className="text-slate-700 font-normal">/{d.max}</span>
                                  </p>
                                </div>
                                <div className="h-1 bg-slate-800/70 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Rodapé ── */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href={`/admin/clientes/${merchant.id}`}
            className="flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar à visão geral
          </Link>
          <p className="text-[11px] text-slate-700">
            Histórico registrado a cada recálculo manual ou em lote
          </p>
        </div>

      </div>
    </div>
  )
}
