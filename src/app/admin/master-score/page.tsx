export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'
import { RecalcAllButton, RecalcSellerButton } from './ScoreActions'
import { SCORE_MAX, sugestaoResumida, type ScoreLevel, type ScoreStatus } from '@/lib/masterScore'

// ─── Formatadores ─────────────────────────────────────────────────────────────

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
function fmtDateShort(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(d))
}

// ─── Metadados visuais ───────────────────────────────────────────────────────

const levelMeta: Record<ScoreLevel, { color: string; bg: string; border: string; dot: string; ring: string; barFill: string }> = {
  Diamante: { color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400',   ring: 'ring-cyan-500/20',   barFill: 'bg-cyan-400' },
  Ouro:     { color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  dot: 'bg-amber-400',  ring: 'ring-amber-500/20',  barFill: 'bg-amber-400' },
  Prata:    { color: 'text-slate-300',  bg: 'bg-slate-700/40',  border: 'border-slate-600/40',  dot: 'bg-slate-400',  ring: 'ring-slate-600/30',  barFill: 'bg-slate-400' },
  Bronze:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-500', ring: 'ring-orange-500/20', barFill: 'bg-orange-500' },
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

// ─── Dimensões ────────────────────────────────────────────────────────────────

const dimensoes = [
  { key: 'volumeScore',      label: 'Volume',     max: SCORE_MAX.volume },
  { key: 'chargebackScore',  label: 'CB',         max: SCORE_MAX.chargeback },
  { key: 'medScore',         label: 'MED',        max: SCORE_MAX.med },
  { key: 'reembolsoScore',   label: 'Reemb.',     max: SCORE_MAX.reembolso },
  { key: 'saldoScore',       label: 'Saldo',      max: SCORE_MAX.saldo },
  { key: 'crescimentoScore', label: 'Cresc.',     max: SCORE_MAX.crescimento },
  { key: 'tempoContaScore',  label: 'Tempo',      max: SCORE_MAX.tempoConta },
  { key: 'margemScore',      label: 'Margem',     max: SCORE_MAX.margem },
]

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function MasterScorePage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const since30d = new Date(Date.now() - 30 * 86_400_000)

  const [merchants, histMes] = await Promise.all([
    prisma.merchant.findMany({
      select: {
        id: true, name: true, plan: true,
        balance: true, pendingBalance: true, reservedBalance: true,
        masterScore: true,
      },
      orderBy: { createdAt: 'asc' },
    }).catch(() => [] as any[]),
    prisma.masterScoreHistory.findMany({
      where:   { createdAt: { gte: since30d } },
      select:  { merchantId: true, scoreBefore: true, scoreAfter: true, nivelBefore: true, nivelAfter: true, motivosAlteracao: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => [] as any[]),
  ])

  // ── Segmentos com/sem score ──
  const comScore = merchants.filter((m: any) => m.masterScore !== null)
  const semScore = merchants.filter((m: any) => m.masterScore === null)
  comScore.sort((a: any, b: any) => b.masterScore.scoreTotal - a.masterScore.scoreTotal)
  const rows = [...comScore, ...semScore.map((m: any) => ({ ...m, masterScore: null }))]

  // ── KPIs por nível/status ──
  const contagem = {
    Diamante: comScore.filter((m: any) => m.masterScore.nivelScore === 'Diamante').length,
    Ouro:     comScore.filter((m: any) => m.masterScore.nivelScore === 'Ouro').length,
    Prata:    comScore.filter((m: any) => m.masterScore.nivelScore === 'Prata').length,
    Bronze:   comScore.filter((m: any) => m.masterScore.nivelScore === 'Bronze').length,
  }
  const scoreTotais  = comScore.map((m: any) => m.masterScore.scoreTotal)
  const scoreMedio   = scoreTotais.length > 0 ? Math.round(scoreTotais.reduce((a: number, v: number) => a + v, 0) / scoreTotais.length) : 0
  const altoRisco    = comScore.filter((m: any) => m.masterScore.statusRisco === 'Alto risco').length
  const alertaCrit   = comScore.filter((m: any) => m.masterScore.chargebackScore === 0 || m.masterScore.medScore === 0).length
  const volumeTotal  = merchants.reduce((s: number, m: any) => s + (m.pendingBalance ?? 0) + (m.balance ?? 0), 0)
  const volumePremium = comScore
    .filter((m: any) => m.masterScore.nivelScore === 'Diamante' || m.masterScore.nivelScore === 'Ouro')
    .reduce((s: number, m: any) => s + (m.pendingBalance ?? 0) + (m.balance ?? 0), 0)
  const volumeRisco = comScore
    .filter((m: any) => m.masterScore.statusRisco === 'Alto risco')
    .reduce((s: number, m: any) => s + (m.pendingBalance ?? 0) + (m.balance ?? 0), 0)

  // ── Sellers que melhoraram / pioraram no mês ──
  const netPorMerchant = new Map<string, { first: number; last: number }>()
  for (const h of histMes) {
    if (!netPorMerchant.has(h.merchantId)) {
      netPorMerchant.set(h.merchantId, { first: h.scoreBefore, last: h.scoreAfter })
    } else {
      netPorMerchant.get(h.merchantId)!.last = h.scoreAfter
    }
  }
  const melhoraram = Array.from(netPorMerchant.values()).filter((v) => v.last > v.first).length
  const pioraram   = Array.from(netPorMerchant.values()).filter((v) => v.last < v.first).length

  // ── Evolução do score médio diário (últimos 30d) ──
  const evolucaoDia = new Map<string, { soma: number; count: number }>()
  for (const h of histMes) {
    const day = new Date(h.createdAt).toISOString().slice(0, 10)
    const cur = evolucaoDia.get(day) ?? { soma: 0, count: 0 }
    evolucaoDia.set(day, { soma: cur.soma + h.scoreAfter, count: cur.count + 1 })
  }
  const evolChart = Array.from(evolucaoDia.entries())
    .map(([day, { soma, count }]) => ({ day, avg: Math.round(soma / count), label: fmtDateShort(new Date(day + 'T12:00:00')) }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // ── Top 10 melhores e piores ──
  const top10Melhores = comScore.slice(0, 10)
  const top10Risco    = [...comScore].sort((a: any, b: any) => a.masterScore.scoreTotal - b.masterScore.scoreTotal).slice(0, 10)

  // ── Principais motivos de queda ──
  const quedas = histMes.filter((h: any) => h.scoreAfter < h.scoreBefore)
  const motivoCount = new Map<string, number>()
  for (const q of quedas) {
    try {
      const motivos: string[] = JSON.parse(q.motivosAlteracao)
      for (const m of motivos) {
        if (m.startsWith('queda em ')) {
          const dim = m.replace('queda em ', '').replace(/ \(.*\)$/, '').trim()
          motivoCount.set(dim, (motivoCount.get(dim) ?? 0) + 1)
        }
      }
    } catch {}
  }
  const topMotivos = Array.from(motivoCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxMotivoCount = topMotivos[0]?.[1] ?? 1

  // ── Distribuição percentual por nível ──
  const totalComScore = comScore.length || 1
  const distrib = ([
    { level: 'Diamante' as ScoreLevel, count: contagem.Diamante },
    { level: 'Ouro'     as ScoreLevel, count: contagem.Ouro },
    { level: 'Prata'    as ScoreLevel, count: contagem.Prata },
    { level: 'Bronze'   as ScoreLevel, count: contagem.Bronze },
  ]).map((d) => ({ ...d, pct: totalComScore > 0 ? Math.round((d.count / totalComScore) * 100) : 0 }))

  return (
    <div>
      <Topbar
        title="Master Score"
        breadcrumb="Casa › Risco"
        subtitle={`Visão executiva · ${merchants.length} seller${merchants.length !== 1 ? 's' : ''} · Score 0–100`}
        actions={<RecalcAllButton />}
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* ══ AVISO INICIAL ══ */}
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

        {/* ══ ROW 1 — KPIs principais ══ */}
        <section>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">Visão Geral da Carteira</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              {
                label: 'Score Médio',
                value: scoreTotais.length ? String(scoreMedio) : '—',
                sub: `de 100 pts · ${comScore.length} sellers`,
                color: scoreColor(scoreMedio).text,
                border: 'border-slate-800/70',
                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                iconColor: 'text-blue-400',
              },
              {
                label: 'Melhoraram no Mês',
                value: String(melhoraram),
                sub: 'score subiu vs início do mês',
                color: 'text-emerald-400',
                border: 'border-emerald-500/20',
                icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
                iconColor: 'text-emerald-400',
              },
              {
                label: 'Pioraram no Mês',
                value: String(pioraram),
                sub: 'score caiu vs início do mês',
                color: pioraram > 0 ? 'text-amber-400' : 'text-slate-500',
                border: pioraram > 0 ? 'border-amber-500/20' : 'border-slate-800/70',
                icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6',
                iconColor: 'text-amber-400',
              },
              {
                label: 'Alertas Críticos',
                value: String(alertaCrit),
                sub: 'CB > 2% ou MED Pix crítico',
                color: alertaCrit > 0 ? 'text-red-400' : 'text-slate-500',
                border: alertaCrit > 0 ? 'border-red-500/25' : 'border-slate-800/70',
                icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                iconColor: 'text-red-400',
              },
              {
                label: 'Alto Risco',
                value: String(altoRisco),
                sub: 'score abaixo de 40 pts',
                color: altoRisco > 0 ? 'text-red-400' : 'text-slate-500',
                border: altoRisco > 0 ? 'border-red-500/20' : 'border-slate-800/70',
                icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
                iconColor: 'text-red-400',
              },
            ].map((c) => (
              <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 flex gap-3`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[22px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                  <p className="text-[11px] text-slate-600 mt-1.5">{c.sub}</p>
                </div>
                <svg className={`w-5 h-5 shrink-0 mt-1 opacity-30 ${c.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
            ))}
          </div>
        </section>

        {/* ══ ROW 2 — KPIs por nível + volume ══ */}
        <section>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">Distribuição e Volume</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {([
              { label: 'Diamante', value: contagem.Diamante, sub: 'score 80–100', color: 'text-cyan-300',   border: 'border-cyan-500/20',   dot: 'bg-cyan-400' },
              { label: 'Ouro',     value: contagem.Ouro,     sub: 'score 60–79',  color: 'text-amber-300',  border: 'border-amber-500/20',  dot: 'bg-amber-400' },
              { label: 'Prata',    value: contagem.Prata,    sub: 'score 40–59',  color: 'text-slate-300',  border: 'border-slate-700/50',  dot: 'bg-slate-400' },
              { label: 'Bronze',   value: contagem.Bronze,   sub: 'score 0–39',   color: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
            ] as { label: string; value: number; sub: string; color: string; border: string; dot: string }[]).map((c) => (
              <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{c.label}</p>
                </div>
                <p className={`text-[22px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                <p className="text-[11px] text-slate-600 mt-1.5">{c.sub}</p>
              </div>
            ))}
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Vol. Premium</p>
              <p className="text-[20px] font-bold tabular-nums leading-none text-cyan-400">{fmtCompact(volumePremium)}</p>
              <p className="text-[11px] text-slate-600 mt-1.5">Diamante + Ouro</p>
            </div>
            <div className="bg-slate-900/60 border border-red-500/20 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Vol. Alto Risco</p>
              <p className={`text-[20px] font-bold tabular-nums leading-none ${volumeRisco > 0 ? 'text-red-400' : 'text-slate-500'}`}>{fmtCompact(volumeRisco)}</p>
              <p className="text-[11px] text-slate-600 mt-1.5">sellers Bronze</p>
            </div>
          </div>
        </section>

        {/* ══ ROW 3 — Distribuição + Evolução lado a lado ══ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Distribuição por nível */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Distribuição por Nível</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{comScore.length} sellers com score calculado</p>
            </div>
            <div className="p-5 space-y-3.5">
              {distrib.map((d) => {
                const lm = levelMeta[d.level]
                return (
                  <div key={d.level}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${lm.dot}`} />
                        <span className={`text-[12px] font-semibold ${lm.color}`}>{d.level}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-slate-600">{d.count} sellers</span>
                        <span className={`text-[12px] font-bold tabular-nums ${lm.color}`}>{d.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800/70 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${lm.barFill} transition-all`} style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                )
              })}

              {/* Mini donut simulado com segmentos de texto */}
              {comScore.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <div className="flex h-3 rounded-full overflow-hidden gap-px">
                    {distrib.filter((d) => d.count > 0).map((d) => (
                      <div
                        key={d.level}
                        className={`h-full ${levelMeta[d.level].barFill}`}
                        style={{ width: `${d.pct}%` }}
                        title={`${d.level}: ${d.count} (${d.pct}%)`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {distrib.filter((d) => d.count > 0).map((d) => (
                      <div key={d.level} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-sm ${levelMeta[d.level].barFill}`} />
                        <span className="text-[10px] text-slate-600">{d.level} {d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evolução do score médio */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Evolução do Score Médio</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Média dos recálculos nos últimos 30 dias</p>
            </div>
            <div className="p-5">
              {evolChart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                  <svg className="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <p className="text-[11px] text-slate-600">Sem histórico ainda</p>
                  <p className="text-[10px] text-slate-700 mt-0.5">Recalcule os scores para gerar o gráfico</p>
                </div>
              ) : (
                <>
                  {/* Grades + barras */}
                  <div className="relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: 24 }}>
                      {[100, 75, 50, 25, 0].map((v) => (
                        <div key={v} className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-700 w-4 text-right shrink-0">{v}</span>
                          <div className="flex-1 border-t border-slate-800/40 border-dashed" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-end gap-1 ml-6" style={{ height: 120 }}>
                      {evolChart.map((d, i) => {
                        const { bar, text } = scoreColor(d.avg)
                        const h = Math.max(4, (d.avg / 100) * 112)
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center group min-w-0">
                            <div className="relative w-full">
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                <div className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
                                  <span className={`text-[9px] font-bold ${text}`}>{d.avg}</span>
                                </div>
                              </div>
                              <div className={`w-full rounded-t ${bar} opacity-75 group-hover:opacity-100 transition-opacity`} style={{ height: `${h}px` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-1 ml-6 mt-1.5">
                      {evolChart.map((d, i) => {
                        const show = evolChart.length <= 8 || i === 0 || i === evolChart.length - 1 || i % Math.ceil(evolChart.length / 6) === 0
                        return (
                          <div key={i} className="flex-1 min-w-0 text-center">
                            {show && <p className="text-[8px] text-slate-700 truncate">{d.label}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/40 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">
                      Mín: <span className="text-slate-400 font-semibold">{Math.min(...evolChart.map((d) => d.avg))}</span>
                    </span>
                    <span className="text-[10px] text-slate-600">
                      Máx: <span className="text-slate-400 font-semibold">{Math.max(...evolChart.map((d) => d.avg))}</span>
                    </span>
                    <span className="text-[10px] text-slate-600">
                      Atual: <span className={`font-bold ${scoreColor(scoreMedio).text}`}>{scoreMedio}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

        </section>

        {/* ══ ROW 4 — Top 10 melhores + top 10 risco ══ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top 10 melhores */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </span>
              <div>
                <p className="text-[13px] font-semibold text-white">Top 10 Melhores Sellers</p>
                <p className="text-[10.5px] text-slate-500">Maior score na carteira</p>
              </div>
            </div>
            {top10Melhores.length === 0 ? (
              <p className="px-5 py-8 text-[11px] text-slate-700 text-center">Sem sellers com score calculado</p>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {top10Melhores.map((m: any, i: number) => {
                  const ms    = m.masterScore
                  const score = Math.round(ms.scoreTotal)
                  const lm    = levelMeta[ms.nivelScore as ScoreLevel] ?? levelMeta['Bronze']
                  const { bar, text } = scoreColor(score)
                  return (
                    <Link
                      key={m.id}
                      href={`/admin/master-score/${m.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/20 transition-colors"
                    >
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums w-4 shrink-0">{i + 1}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${lm.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-200 truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-600">{m.plan}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${bar}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className={`text-[12px] font-bold tabular-nums ${text} w-6 text-right`}>{score}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top 10 maior risco */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </span>
              <div>
                <p className="text-[13px] font-semibold text-white">Top 10 Maior Risco</p>
                <p className="text-[10.5px] text-slate-500">Menor score — atenção imediata</p>
              </div>
              {altoRisco > 0 && (
                <div className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  {altoRisco} alto risco
                </div>
              )}
            </div>
            {top10Risco.length === 0 ? (
              <p className="px-5 py-8 text-[11px] text-slate-700 text-center">Sem sellers com score calculado</p>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {top10Risco.map((m: any, i: number) => {
                  const ms     = m.masterScore
                  const score  = Math.round(ms.scoreTotal)
                  const status = ms.statusRisco as ScoreStatus
                  const sm     = statusMeta[status] ?? statusMeta['Alto risco']
                  const { bar, text } = scoreColor(score)
                  const isAlert = ms.chargebackScore === 0 || ms.medScore === 0
                  return (
                    <Link
                      key={m.id}
                      href={`/admin/master-score/${m.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/20 transition-colors"
                    >
                      <span className="text-[11px] font-bold text-slate-700 tabular-nums w-4 shrink-0">{i + 1}</span>
                      {isAlert ? (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-500 animate-pulse" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreColor(score).bar}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-200 truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-600">{m.plan}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border ${sm.color} ${sm.bg} ${sm.border}`}>
                          {status}
                        </span>
                        <span className={`text-[12px] font-bold tabular-nums ${text} w-6 text-right`}>{score}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </section>

        {/* ══ ROW 5 — Motivos de queda ══ */}
        {topMotivos.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Principais Motivos de Queda</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Indicadores que mais causaram redução de score nos últimos 30 dias · {quedas.length} queda{quedas.length !== 1 ? 's' : ''} registrada{quedas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-full">
                últimos 30 dias
              </span>
            </div>
            <div className="p-5 space-y-3">
              {topMotivos.map(([motivo, count]) => {
                const pct = Math.round((count / maxMotivoCount) * 100)
                const label = motivo.charAt(0).toUpperCase() + motivo.slice(1)
                const severity = pct >= 70 ? { text: 'text-red-400', bar: 'bg-red-400' }
                               : pct >= 40 ? { text: 'text-amber-400', bar: 'bg-amber-400' }
                               : { text: 'text-slate-400', bar: 'bg-slate-500' }
                return (
                  <div key={motivo}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-medium text-slate-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold tabular-nums ${severity.text}`}>{count}x</span>
                        <span className="text-[10px] text-slate-600">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-800/70 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${severity.bar} opacity-80`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ══ RANKING COMPLETO ══ */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-white">Ranking Completo</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Todos os sellers ordenados por score · clique no nome para detalhes</p>
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
              <p className="text-[13px] font-medium">Nenhum seller cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-10 text-center">#</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left">Seller</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left min-w-[160px]">Score</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left min-w-[340px] hidden xl:table-cell">Composição</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center hidden sm:table-cell">Nível</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left hidden xl:table-cell">Sugestão</th>
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
                    const lm     = levelMeta[level]
                    const sm     = statusMeta[status]
                    const isAlert = ms && (ms.chargebackScore === 0 || ms.medScore === 0)

                    return (
                      <tr key={m.id} className={`hover:bg-slate-800/20 transition-colors ${isAlert ? 'bg-red-500/3' : ''}`}>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-[12px] font-bold text-slate-600 tabular-nums">{i + 1}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link href={`/admin/master-score/${m.id}`} className="flex items-center gap-2.5 group">
                            {isAlert ? (
                              <span className="w-2 h-2 rounded-full shrink-0 bg-red-500 animate-pulse" />
                            ) : (
                              <span className={`w-2 h-2 rounded-full shrink-0 ${planDot[m.plan] ?? 'bg-slate-500'}`} />
                            )}
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-200 group-hover:text-white truncate max-w-[150px] transition-colors">{m.name}</p>
                              <p className="text-[11px] text-slate-600">{m.plan}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          {ms ? <ScoreBar score={score} /> : (
                            <span className="text-[11px] text-slate-700 italic">não calculado</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 hidden xl:table-cell">
                          {ms ? (
                            <div className="grid grid-cols-4 gap-x-4 gap-y-2 min-w-[320px]">
                              {dimensoes.map((d) => (
                                <MiniBar key={d.key} pts={Math.round(ms[d.key] ?? 0)} max={d.max} label={d.label} />
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-800 text-[11px] italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${lm.color} ${lm.bg} ${lm.border}`}>{level}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>{status}</span>
                        </td>
                        <td className="px-4 py-3.5 hidden xl:table-cell max-w-[200px]">
                          {ms ? (() => {
                            const resumo   = sugestaoResumida(ms)
                            const isAltoR  = status === 'Alto risco'
                            const isAten   = status === 'Atenção'
                            const isPrem   = status === 'Premium'
                            const dotCls   = isAltoR ? 'bg-red-400' : isAten ? 'bg-amber-400' : isPrem ? 'bg-cyan-400' : 'bg-emerald-400'
                            const txtCls   = isAltoR ? 'text-red-300' : isAten ? 'text-amber-300' : isPrem ? 'text-cyan-300' : 'text-emerald-300'
                            return (
                              <div className="flex items-start gap-1.5">
                                <span className={`mt-[4px] w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                                <p className={`text-[11px] font-medium leading-snug ${txtCls}`}>{resumo}</p>
                              </div>
                            )
                          })() : <span className="text-slate-800 text-[11px] italic">—</span>}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell max-w-[220px]">
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{ms?.observacaoInterna ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                          <span className="text-[11px] text-slate-700">{ms ? fmtDate(ms.dataUltimaAtualizacao) : '—'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 justify-end">
                            <RecalcSellerButton merchantId={m.id} />
                            <Link
                              href={`/admin/master-score/${m.id}`}
                              className="inline-flex items-center px-2.5 py-1 text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
                            >
                              Detalhes
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

        {/* ══ TABELA DE PONTUAÇÃO ══ */}
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
                  { label: 'Volume Mensal', max: 20, faixas: [{ cond: 'Acima de R$ 100.000', pts: 20 }, { cond: 'R$ 50.000–R$ 100.000', pts: 15 }, { cond: 'R$ 10.000–R$ 50.000', pts: 10 }, { cond: 'Abaixo de R$ 10.000', pts: 5 }, { cond: 'Sem volume', pts: 0 }] },
                  { label: 'Chargeback', max: 25, faixas: [{ cond: '0%–0,50%', pts: 25 }, { cond: '0,51%–1,00%', pts: 18 }, { cond: '1,01%–2,00%', pts: 10 }, { cond: 'Acima de 2%', pts: 0 }] },
                  { label: 'MED Pix', max: 15, faixas: [{ cond: 'Nenhum', pts: 15 }, { cond: '1 MED', pts: 10 }, { cond: '2–3 MEDs', pts: 5 }, { cond: 'Acima de 3', pts: 0 }] },
                  { label: 'Reembolso', max: 10, faixas: [{ cond: 'Até 2%', pts: 10 }, { cond: '2,01%–5%', pts: 6 }, { cond: '5,01%–10%', pts: 3 }, { cond: 'Acima de 10%', pts: 0 }] },
                  { label: 'Saldo Médio', max: 10, faixas: [{ cond: '≥ R$ 20.000', pts: 10 }, { cond: 'R$ 5k–R$ 20k', pts: 6 }, { cond: '< R$ 5.000', pts: 3 }, { cond: 'Sem saldo', pts: 0 }] },
                  { label: 'Crescimento', max: 10, faixas: [{ cond: '≥ +10%', pts: 10 }, { cond: '−5% a +10%', pts: 5 }, { cond: 'Primeiro mês', pts: 5 }, { cond: '< −5%', pts: 0 }] },
                  { label: 'Tempo de Conta', max: 5, faixas: [{ cond: '> 90 dias', pts: 5 }, { cond: '30–90 dias', pts: 3 }, { cond: '< 30 dias', pts: 1 }] },
                  { label: 'Margem Plataforma', max: 5, faixas: [{ cond: '≥ R$ 500 ou ≥ 1,5%', pts: 5 }, { cond: '≥ R$ 100 ou ≥ 0,5%', pts: 3 }, { cond: 'Baixa margem', pts: 1 }, { cond: 'Sem margem', pts: 0 }] },
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
                              {f.pts}pt{f.pts !== 1 ? 's' : ''}
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800/30">
                  <td className="px-5 py-3 font-bold text-[13px] text-white">Total máximo</td>
                  <td className="px-5 py-3 text-right"><span className="text-[14px] font-bold text-emerald-400 tabular-nums">100</span></td>
                  <td className="px-5 py-3"><span className="text-[11px] text-slate-500">Soma de todas as dimensões</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[11px] text-slate-700 text-center pb-2">
          Master Score é uma ferramenta de apoio à decisão. Não bloqueia operações automaticamente nem altera saldos.
        </p>

      </div>
    </div>
  )
}
