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

const statusMeta: Record<ScoreStatus, { color: string; bg: string; border: string; dot: string }> = {
  Premium:      { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    dot: 'bg-cyan-400' },
  Saudável:     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  Atenção:      { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400' },
  'Alto risco': { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400' },
}

function scoreColor(score: number) {
  if (score >= 80) return { bar: 'bg-cyan-400',    text: 'text-cyan-400' }
  if (score >= 60) return { bar: 'bg-emerald-400', text: 'text-emerald-400' }
  if (score >= 40) return { bar: 'bg-amber-400',   text: 'text-amber-400' }
  return                  { bar: 'bg-red-400',      text: 'text-red-400' }
}

// ─── Derivar métricas aproximadas a partir dos scores ────────────────────────
// Usado para preencher colunas de "volume mensal", "taxa CB", etc. na fase 1,
// onde esses valores não estão armazenados individualmente no banco.

function volumeLabel(pts: number): string {
  if (pts >= 20) return '> R$ 100k'
  if (pts >= 15) return 'R$ 50–100k'
  if (pts >= 10) return 'R$ 10–50k'
  if (pts >= 5)  return '< R$ 10k'
  return '—'
}

function cbLabel(pts: number): string {
  if (pts >= 25) return '< 0,5%'
  if (pts >= 18) return '0,5–1%'
  if (pts >= 10) return '1–2%'
  return '> 2%'
}

function cbColor(pts: number): string {
  if (pts >= 25) return 'text-emerald-400'
  if (pts >= 18) return 'text-slate-300'
  if (pts >= 10) return 'text-amber-400'
  return 'text-red-400'
}

function medLabel(pts: number): string {
  if (pts >= 15) return '0'
  if (pts >= 10) return '1'
  if (pts >= 5)  return '2–3'
  return '> 3'
}

function medColor(pts: number): string {
  if (pts >= 15) return 'text-emerald-400'
  if (pts >= 10) return 'text-slate-300'
  if (pts >= 5)  return 'text-amber-400'
  return 'text-red-400'
}

function reembolsoLabel(pts: number): string {
  if (pts >= 10) return '≤ 2%'
  if (pts >= 6)  return '2–5%'
  if (pts >= 3)  return '5–10%'
  return '> 10%'
}

function reembolsoColor(pts: number): string {
  if (pts >= 10) return 'text-emerald-400'
  if (pts >= 6)  return 'text-slate-300'
  if (pts >= 3)  return 'text-amber-400'
  return 'text-red-400'
}

// ─── Componentes inline ───────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const { bar, text } = scoreColor(score)
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[13px] font-bold tabular-nums w-7 text-right shrink-0 ${text}`}>{score}</span>
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

  // ── KPIs ──
  const scoreTotais   = comScore.map((m: any) => m.masterScore.scoreTotal)
  const scoreMedio    = scoreTotais.length > 0 ? Math.round(scoreTotais.reduce((a: number, v: number) => a + v, 0) / scoreTotais.length) : 0
  const sellersPremu  = comScore.filter((m: any) => m.masterScore.statusRisco === 'Premium').length
  const sellersAtenc  = comScore.filter((m: any) => m.masterScore.statusRisco === 'Atenção').length
  const altoRisco     = comScore.filter((m: any) => m.masterScore.statusRisco === 'Alto risco').length
  const volumeTotal   = merchants.reduce((s: number, m: any) => s + (m.pendingBalance ?? 0) + (m.reservedBalance ?? 0) + (m.balance ?? 0), 0)
  const reservaTotal  = merchants.reduce((s: number, m: any) => s + (m.reservedBalance ?? 0), 0)

  // ── Contagem por nível ──
  const contagem = {
    Diamante: comScore.filter((m: any) => m.masterScore.nivelScore === 'Diamante').length,
    Ouro:     comScore.filter((m: any) => m.masterScore.nivelScore === 'Ouro').length,
    Prata:    comScore.filter((m: any) => m.masterScore.nivelScore === 'Prata').length,
    Bronze:   comScore.filter((m: any) => m.masterScore.nivelScore === 'Bronze').length,
  }

  // ── Evolução do score médio diário ──
  const evolucaoDia = new Map<string, { soma: number; count: number }>()
  for (const h of histMes) {
    const day = new Date(h.createdAt).toISOString().slice(0, 10)
    const cur = evolucaoDia.get(day) ?? { soma: 0, count: 0 }
    evolucaoDia.set(day, { soma: cur.soma + h.scoreAfter, count: cur.count + 1 })
  }
  const evolChart = Array.from(evolucaoDia.entries())
    .map(([day, { soma, count }]) => ({ day, avg: Math.round(soma / count), label: fmtDateShort(new Date(day + 'T12:00:00')) }))
    .sort((a, b) => a.day.localeCompare(b.day))

  // ── Distribuição ──
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
        subtitle={`Saúde financeira, risco e performance · ${merchants.length} seller${merchants.length !== 1 ? 's' : ''} · Score 0–100`}
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

        {/* ══ KPI CARDS — 6 indicadores principais ══ */}
        <section>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">Visão Geral da Carteira</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">

            {/* 1. Score médio */}
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">Score Médio</p>
                <svg className="w-4 h-4 text-blue-400 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className={`text-[28px] font-bold tabular-nums leading-none ${scoreColor(scoreMedio).text}`}>
                  {scoreTotais.length ? scoreMedio : '—'}
                </p>
                <div className="mt-2 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${scoreColor(scoreMedio).bar}`} style={{ width: `${scoreMedio}%` }} />
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">de 100 pts · {comScore.length} sellers</p>
              </div>
            </div>

            {/* 2. Sellers Premium */}
            <div className={`bg-slate-900/60 rounded-xl p-4 flex flex-col gap-3 border ${sellersPremu > 0 ? 'border-cyan-500/20' : 'border-slate-800/70'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">Sellers Premium</p>
                <svg className="w-4 h-4 text-cyan-400 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
              </div>
              <div>
                <p className={`text-[28px] font-bold tabular-nums leading-none ${sellersPremu > 0 ? 'text-cyan-300' : 'text-slate-600'}`}>{sellersPremu}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <p className="text-[10px] text-slate-600">status Premium · Diamante ou Ouro</p>
                </div>
              </div>
            </div>

            {/* 3. Sellers em atenção */}
            <div className={`bg-slate-900/60 rounded-xl p-4 flex flex-col gap-3 border ${sellersAtenc > 0 ? 'border-amber-500/20' : 'border-slate-800/70'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">Em Atenção</p>
                <svg className="w-4 h-4 text-amber-400 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className={`text-[28px] font-bold tabular-nums leading-none ${sellersAtenc > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{sellersAtenc}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {sellersAtenc > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                  {sellersAtenc === 0 && <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                  <p className="text-[10px] text-slate-600">indicadores em monitoramento</p>
                </div>
              </div>
            </div>

            {/* 4. Alto risco */}
            <div className={`bg-slate-900/60 rounded-xl p-4 flex flex-col gap-3 border ${altoRisco > 0 ? 'border-red-500/25' : 'border-slate-800/70'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">Alto Risco</p>
                <svg className="w-4 h-4 text-red-400 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className={`text-[28px] font-bold tabular-nums leading-none ${altoRisco > 0 ? 'text-red-400' : 'text-slate-600'}`}>{altoRisco}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {altoRisco > 0 ? (
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  )}
                  <p className="text-[10px] text-slate-600">score abaixo de 40 pts</p>
                </div>
              </div>
            </div>

            {/* 5. Volume total analisado */}
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">Volume Analisado</p>
                <svg className="w-4 h-4 text-blue-400 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[22px] font-bold tabular-nums leading-none text-white">{fmtCompact(volumeTotal)}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">saldo total em carteira · {merchants.length} sellers</p>
              </div>
            </div>

            {/* 6. Reservas sugeridas */}
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">Reservas Ativas</p>
                <svg className="w-4 h-4 text-violet-400 opacity-40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-[22px] font-bold tabular-nums leading-none text-violet-300">{fmtCompact(reservaTotal)}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">total em reserva de risco · todos os sellers</p>
              </div>
            </div>

          </div>
        </section>

        {/* ══ TABELA PRINCIPAL DE SELLERS ══ */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-white">Análise de Sellers</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Saúde financeira, risco e performance · ordenado por score ·{' '}
                <span className="text-slate-700">métricas de volume e taxas derivadas do score (fase 1)</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum seller cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/40">
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-center w-8 sticky left-0 bg-slate-900/60">#</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-left min-w-[160px]">Seller / Empresa</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right">Volume Mensal</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right">Saldo Médio</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-center">Taxa CB</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-center">MED Pix</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-center">Taxa Reemb.</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right">Reserva Atual</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-left min-w-[130px]">Score Atual</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-center">Nível</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-center">Status</th>
                    <th className="px-4 py-3 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-left min-w-[160px]">Sugestão do Sistema</th>
                    <th className="px-4 py-3 w-24"></th>
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

                    const cbPts   = ms?.chargebackScore  ?? -1
                    const medPts  = ms?.medScore         ?? -1
                    const rembPts = ms?.reembolsoScore   ?? -1
                    const volPts  = ms?.volumeScore      ?? -1

                    const resumo = ms ? sugestaoResumida(ms) : null

                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-slate-800/20 transition-colors ${isAlert ? 'bg-red-500/[0.03]' : ''}`}
                      >
                        {/* # */}
                        <td className="px-4 py-3.5 text-center sticky left-0 bg-inherit">
                          <span className="text-[11px] font-bold text-slate-700 tabular-nums">{i + 1}</span>
                        </td>

                        {/* Seller */}
                        <td className="px-4 py-3.5">
                          <Link href={`/admin/master-score/${m.id}`} className="flex items-center gap-2.5 group">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${lm.bg} ${lm.color} border ${lm.border}`}>
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-slate-200 group-hover:text-white truncate max-w-[150px] transition-colors leading-tight">{m.name}</p>
                              <p className="text-[10px] text-slate-600 mt-0.5">{m.plan}</p>
                            </div>
                          </Link>
                        </td>

                        {/* Volume Mensal */}
                        <td className="px-4 py-3.5 text-right">
                          {ms ? (
                            <span className="text-[12px] font-semibold text-slate-300 tabular-nums">
                              {volumeLabel(volPts)}
                            </span>
                          ) : (
                            <span className="text-slate-700 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Saldo Médio */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[12px] font-semibold text-slate-300 tabular-nums">
                            {fmtCompact(m.pendingBalance ?? 0)}
                          </span>
                        </td>

                        {/* Taxa CB */}
                        <td className="px-4 py-3.5 text-center">
                          {ms ? (
                            <span className={`text-[12px] font-bold tabular-nums ${cbColor(cbPts)}`}>
                              {cbLabel(cbPts)}
                            </span>
                          ) : (
                            <span className="text-slate-700 text-[11px]">—</span>
                          )}
                        </td>

                        {/* MED Pix */}
                        <td className="px-4 py-3.5 text-center">
                          {ms ? (
                            <span className={`text-[12px] font-bold tabular-nums ${medColor(medPts)}`}>
                              {medLabel(medPts)}
                            </span>
                          ) : (
                            <span className="text-slate-700 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Taxa Reembolso */}
                        <td className="px-4 py-3.5 text-center">
                          {ms ? (
                            <span className={`text-[12px] font-bold tabular-nums ${reembolsoColor(rembPts)}`}>
                              {reembolsoLabel(rembPts)}
                            </span>
                          ) : (
                            <span className="text-slate-700 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Reserva Atual */}
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-[12px] font-semibold tabular-nums ${(m.reservedBalance ?? 0) > 0 ? 'text-violet-300' : 'text-slate-600'}`}>
                            {fmtCompact(m.reservedBalance ?? 0)}
                          </span>
                        </td>

                        {/* Score Atual */}
                        <td className="px-4 py-3.5">
                          {ms ? (
                            <ScoreBar score={score} />
                          ) : (
                            <span className="text-[11px] text-slate-700 italic">não calculado</span>
                          )}
                        </td>

                        {/* Nível */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${lm.color} ${lm.bg} ${lm.border}`}>
                            <span className={`w-1 h-1 rounded-full ${lm.dot}`} />
                            {level}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                            {isAlert ? (
                              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                            ) : (
                              <span className={`w-1 h-1 rounded-full ${sm.dot}`} />
                            )}
                            {status}
                          </span>
                        </td>

                        {/* Sugestão */}
                        <td className="px-4 py-3.5 max-w-[180px]">
                          {resumo ? (
                            <div className="flex items-start gap-1.5">
                              <span className={`mt-1 w-1 h-1 rounded-full shrink-0 ${
                                status === 'Alto risco' ? 'bg-red-400' :
                                status === 'Atenção'    ? 'bg-amber-400' :
                                status === 'Premium'    ? 'bg-cyan-400' :
                                'bg-emerald-400'
                              }`} />
                              <p className={`text-[11px] font-medium leading-snug line-clamp-2 ${
                                status === 'Alto risco' ? 'text-red-300' :
                                status === 'Atenção'    ? 'text-amber-300' :
                                status === 'Premium'    ? 'text-cyan-300' :
                                'text-emerald-300'
                              }`}>{resumo}</p>
                            </div>
                          ) : (
                            <span className="text-slate-700 text-[11px] italic">—</span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 justify-end">
                            <RecalcSellerButton merchantId={m.id} />
                            <Link
                              href={`/admin/master-score/${m.id}`}
                              className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors whitespace-nowrap"
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

              {/* Rodapé da tabela */}
              <div className="px-5 py-3 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-700">
                  {rows.length} seller{rows.length !== 1 ? 's' : ''} · {comScore.length} com score calculado
                </span>
                <div className="flex items-center gap-4">
                  {(['Diamante', 'Ouro', 'Prata', 'Bronze'] as ScoreLevel[]).map((lv) => {
                    const count = comScore.filter((m: any) => m.masterScore.nivelScore === lv).length
                    if (count === 0) return null
                    return (
                      <div key={lv} className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${levelMeta[lv].dot}`} />
                        <span className="text-[11px] text-slate-600">
                          <span className={`font-semibold ${levelMeta[lv].color}`}>{count}</span> {lv}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ══ SEGUNDA LINHA — Distribuição + Evolução ══ */}
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
                      <div className={`h-full rounded-full ${lm.barFill}`} style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {comScore.length > 0 && (
                <div className="pt-3 border-t border-slate-800/40">
                  <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
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
                        const { bar } = scoreColor(d.avg)
                        const h = Math.max(4, (d.avg / 100) * 112)
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center group min-w-0">
                            <div className="relative w-full">
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                <div className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
                                  <span className={`text-[9px] font-bold ${scoreColor(d.avg).text}`}>{d.avg}</span>
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
                    <span className="text-[10px] text-slate-600">Mín: <span className="text-slate-400 font-semibold">{Math.min(...evolChart.map((d) => d.avg))}</span></span>
                    <span className="text-[10px] text-slate-600">Máx: <span className="text-slate-400 font-semibold">{Math.max(...evolChart.map((d) => d.avg))}</span></span>
                    <span className="text-[10px] text-slate-600">Atual: <span className={`font-bold ${scoreColor(scoreMedio).text}`}>{scoreMedio}</span></span>
                  </div>
                </>
              )}
            </div>
          </div>

        </section>

        {/* ══ TABELA DE PONTUAÇÃO — Referência ══ */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Critérios de Pontuação</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Faixas usadas no cálculo do Master Score · total máximo: 100 pts</p>
            </div>
            <div className="flex items-center gap-3">
              {([
                { label: 'Diamante', range: '80–100', lv: 'Diamante' as ScoreLevel },
                { label: 'Ouro',     range: '60–79',  lv: 'Ouro'     as ScoreLevel },
                { label: 'Prata',    range: '40–59',  lv: 'Prata'    as ScoreLevel },
                { label: 'Bronze',   range: '0–39',   lv: 'Bronze'   as ScoreLevel },
              ]).map((b) => (
                <div key={b.label} className={`hidden sm:flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border ${levelMeta[b.lv].color} ${levelMeta[b.lv].bg} ${levelMeta[b.lv].border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${levelMeta[b.lv].dot}`} />
                  <span className="font-semibold">{b.label}</span>
                  <span className="text-slate-600 font-normal">{b.range}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/50">
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-left">Dimensão</th>
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-right w-16">Máx.</th>
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider text-left">Faixas e pontuação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {[
                  { label: 'Volume Mensal',      max: 20, faixas: [{ cond: '> R$100k', pts: 20 }, { cond: 'R$50–100k', pts: 15 }, { cond: 'R$10–50k', pts: 10 }, { cond: '< R$10k', pts: 5 }, { cond: 'Sem volume', pts: 0 }] },
                  { label: 'Chargeback',         max: 25, faixas: [{ cond: '< 0,5%', pts: 25 }, { cond: '0,5–1%', pts: 18 }, { cond: '1–2%', pts: 10 }, { cond: '> 2%', pts: 0 }] },
                  { label: 'MED Pix',            max: 15, faixas: [{ cond: '0 MEDs', pts: 15 }, { cond: '1 MED', pts: 10 }, { cond: '2–3 MEDs', pts: 5 }, { cond: '> 3', pts: 0 }] },
                  { label: 'Reembolso',          max: 10, faixas: [{ cond: '≤ 2%', pts: 10 }, { cond: '2–5%', pts: 6 }, { cond: '5–10%', pts: 3 }, { cond: '> 10%', pts: 0 }] },
                  { label: 'Saldo Médio',        max: 10, faixas: [{ cond: '≥ R$20k', pts: 10 }, { cond: 'R$5–20k', pts: 6 }, { cond: '< R$5k', pts: 3 }, { cond: 'Sem saldo', pts: 0 }] },
                  { label: 'Crescimento',        max: 10, faixas: [{ cond: '≥ +10%', pts: 10 }, { cond: '−5% a +10%', pts: 5 }, { cond: 'Primeiro mês', pts: 5 }, { cond: '< −5%', pts: 0 }] },
                  { label: 'Tempo de Conta',     max: 5,  faixas: [{ cond: '> 90 dias', pts: 5 }, { cond: '30–90 dias', pts: 3 }, { cond: '< 30 dias', pts: 1 }] },
                  { label: 'Margem Plataforma',  max: 5,  faixas: [{ cond: '≥ R$500 ou ≥1,5%', pts: 5 }, { cond: '≥ R$100 ou ≥0,5%', pts: 3 }, { cond: 'Baixa margem', pts: 1 }, { cond: 'Sem margem', pts: 0 }] },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-slate-800/10 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[12px] font-semibold text-slate-300">{row.label}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[12px] font-bold text-blue-400 tabular-nums">{row.max}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {row.faixas.map((f) => (
                          <span key={f.cond} className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded-md">
                            {f.cond}
                            <span className={`font-bold ${f.pts === row.max ? 'text-emerald-400' : f.pts === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                              {f.pts}p
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800/20">
                  <td className="px-5 py-2.5 font-bold text-[12px] text-white">Total máximo</td>
                  <td className="px-5 py-2.5 text-right"><span className="text-[13px] font-bold text-emerald-400 tabular-nums">100</span></td>
                  <td className="px-5 py-2.5"><span className="text-[10px] text-slate-600">Soma de todas as dimensões</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[10px] text-slate-700 text-center pb-2">
          Master Score é uma ferramenta de apoio à decisão. Não bloqueia operações automaticamente nem altera saldos.
          Métricas de volume e taxas na tabela são faixas derivadas do score (fase 1) — valores exatos virão na próxima fase.
        </p>

      </div>
    </div>
  )
}
