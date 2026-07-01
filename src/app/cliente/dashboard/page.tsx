export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'
import { Suspense } from 'react'
import { PeriodFilter } from './PeriodFilter'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatBRLCompact(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`
  return `R$ ${formatBRL(v)}`
}

function anualizarTaxa(mensal: number) {
  return (Math.pow(1 + mensal / 100, 12) - 1) * 100
}

function formatDateShort(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

function formatDay(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d)
}

function getPeriodStart(periodo: string): Date | null {
  const now = new Date()
  if (periodo === '1d')  { const d = new Date(now); d.setDate(d.getDate() - 1);  return d }
  if (periodo === '7d')  { const d = new Date(now); d.setDate(d.getDate() - 7);  return d }
  if (periodo === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return d }
  if (periodo === '90d') { const d = new Date(now); d.setDate(d.getDate() - 90); return d }
  return null
}

function getAmount(metadata: string | null): number {
  try {
    const m = JSON.parse(metadata ?? '{}')
    return parseFloat(m.amount || m.value || 0)
  } catch { return 0 }
}

const logMeta: Record<string, { label: string; sign: string; color: string; dot: string; icon: string }> = {
  ADD_TO_CDI:          { label: 'Aporte CDI',             sign: '+', color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  WITHDRAW_REQUEST:    { label: 'Saque Solicitado',        sign: '-', color: 'text-amber-400',   dot: 'bg-amber-500/10 text-amber-400',    icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
  WITHDRAW_APPROVED:   { label: 'Saque Aprovado',          sign: '-', color: 'text-blue-400',    dot: 'bg-blue-500/10 text-blue-400',      icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
  WITHDRAW_DENIED:     { label: 'Saque Negado',            sign: '',  color: 'text-red-400',     dot: 'bg-red-500/10 text-red-400',        icon: 'M6 18L18 6M6 6l12 12' },
  CDI_CREDIT:          { label: 'Rendimento CDI',          sign: '+', color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  CDI_WITHDRAW:        { label: 'Resgate CDI',             sign: '-', color: 'text-amber-400',   dot: 'bg-amber-500/10 text-amber-400',    icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
  CDI_LOCK_SET:        { label: 'Título CDI Criado',       sign: '',  color: 'text-purple-400',  dot: 'bg-purple-500/10 text-purple-400',  icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  CDI_EARLY_APPROVED:  { label: 'Resgate Ant. Aprovado',   sign: '+', color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400', icon: 'M9 12l2 2 4-4' },
  CDI_EARLY_DENIED:    { label: 'Resgate Ant. Negado',     sign: '',  color: 'text-red-400',     dot: 'bg-red-500/10 text-red-400',        icon: 'M6 18L18 6M6 6l12 12' },
  ANTECIPACAO_REQUEST: { label: 'Antecipação',             sign: '+', color: 'text-blue-400',    dot: 'bg-blue-500/10 text-blue-400',      icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  BALANCE_ADJUST:      { label: 'Venda Recebida',          sign: '+', color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4' },
  KYC_APPROVED:        { label: 'KYC Aprovado',            sign: '',  color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  MERCHANT_CREATED:    { label: 'Conta Criada',            sign: '',  color: 'text-blue-400',    dot: 'bg-blue-500/10 text-blue-400',      icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z' },
  CDI_RATE_UPDATED:    { label: 'Taxa CDI Atualizada',     sign: '',  color: 'text-purple-400',  dot: 'bg-purple-500/10 text-purple-400',  icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
}

const planBg: Record<string, string> = {
  Start:  'bg-slate-900/60 border-slate-800/70',
  Growth: 'bg-blue-950/40 border-blue-500/20',
  Prime:  'bg-purple-950/40 border-purple-500/20',
  Black:  'bg-slate-900/80 border-slate-600/30',
}
const planColor: Record<string, string> = {
  Start: 'text-slate-300', Growth: 'text-blue-400', Prime: 'text-purple-400', Black: 'text-white',
}

// Build chart data: sum of credit events by day for the last N days
function buildChartData(logs: { createdAt: Date; metadata: string | null; action: string }[], days: number) {
  const CREDIT_ACTIONS = ['BALANCE_ADJUST', 'CDI_CREDIT', 'ANTECIPACAO_REQUEST', 'CDI_EARLY_APPROVED']
  const buckets: Record<string, number> = {}
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = 0
  }
  for (const log of logs) {
    if (!CREDIT_ACTIONS.includes(log.action)) continue
    const key = new Date(log.createdAt).toISOString().slice(0, 10)
    if (key in buckets) buckets[key] += getAmount(log.metadata)
  }
  return Object.entries(buckets).map(([date, value]) => ({ date, value }))
}

export default async function ClienteDashboardPage({ searchParams }: { searchParams: { periodo?: string } }) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant    = user?.merchant
  const firstName   = session?.user?.name?.split(' ')[0] ?? 'Seller'
  const saldo       = merchant?.balance         ?? 0
  const pendente    = merchant?.pendingBalance  ?? 0
  const cdiRate     = merchant?.cdiRate          ?? 1.0
  const cdiAnual    = anualizarTaxa(cdiRate)
  const plano       = merchant?.plan ?? '—'
  const merchantStatus   = merchant?.status ?? 'ACTIVE'
  const reservedBalance  = merchant?.reservedBalance ?? 0
  const blockedBalance   = merchant?.blockedBalance  ?? 0
  const futureBalance    = merchant?.futureBalance   ?? 0
  const totalProtected   = reservedBalance + blockedBalance + futureBalance

  const periodo     = searchParams?.periodo ?? '30d'
  const periodoStart = getPeriodStart(periodo)

  const whereBase = {
    entityId: merchant?.id ?? '',
    entity: 'Merchant' as const,
    ...(periodoStart ? { createdAt: { gte: periodoStart } } : {}),
  }

  // Fetch all logs for the period
  const periodLogs = merchant
    ? await prisma.auditLog.findMany({
        where: whereBase,
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
    : []

  // KPI aggregations
  const totalRecebido = periodLogs
    .filter(l => l.action === 'BALANCE_ADJUST')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  const totalSacado = periodLogs
    .filter(l => l.action === 'WITHDRAW_APPROVED')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  const totalCdiCredits = periodLogs
    .filter(l => l.action === 'CDI_CREDIT')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  const totalAportadoCdi = periodLogs
    .filter(l => l.action === 'ADD_TO_CDI')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  const numVendas = periodLogs.filter(l => l.action === 'BALANCE_ADJUST').length

  // For chart: always use last 30d of data regardless of period filter to give meaningful chart
  const chartDays = periodo === '1d' ? 1 : periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30
  const chartData = buildChartData(periodLogs, chartDays)
  const chartMax  = Math.max(...chartData.map(d => d.value), 1)

  // Recent logs (most recent 10)
  const recentLogs = periodLogs.slice(0, 10)

  const rendimentoMes = saldo * (cdiRate / 100)

  return (
    <div>
      <Topbar
        title={`Olá, ${firstName}`}
        subtitle="Visão geral da sua conta"
        breadcrumb="Dashboard"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* ── Status Alerts ── */}
        {merchantStatus === 'REVIEW' && (
          <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-amber-400">Conta em revisão</p>
              <p className="text-[13px] text-slate-500 mt-0.5">Sua conta está em análise. Algumas operações podem estar temporariamente indisponíveis.</p>
            </div>
          </div>
        )}
        {merchantStatus === 'BLOCKED' && (
          <div className="bg-red-500/8 border border-red-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-red-400">Conta bloqueada</p>
              <p className="text-[13px] text-slate-500 mt-0.5">Sua conta foi bloqueada. Entre em contato com o suporte para regularizar sua situação.</p>
            </div>
          </div>
        )}

        {/* ── Period Filter + Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[13px] text-slate-600 uppercase tracking-widest font-semibold">Período de análise</p>
          </div>
          <Suspense fallback={null}>
            <PeriodFilter />
          </Suspense>
        </div>

        {/* ── KPI Grid Row 1 ── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            {
              label: 'Saldo Disponível',
              value: formatBRLCompact(pendente),
              sub: 'Livre para saque',
              color: 'text-emerald-400',
              border: 'border-emerald-500/20',
              icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
              iconBg: 'bg-emerald-500/10 text-emerald-400',
            },
            {
              label: 'Total Recebido',
              value: formatBRLCompact(totalRecebido),
              sub: `${numVendas} venda${numVendas !== 1 ? 's' : ''}`,
              color: 'text-blue-400',
              border: 'border-blue-500/15',
              icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
              iconBg: 'bg-blue-500/10 text-blue-400',
            },
            {
              label: 'Rendimento CDI',
              value: formatBRLCompact(totalCdiCredits),
              sub: `${cdiRate.toFixed(2)}%/mês`,
              color: 'text-purple-400',
              border: 'border-purple-500/15',
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
              iconBg: 'bg-purple-500/10 text-purple-400',
            },
            {
              label: 'Saldo em CDI',
              value: formatBRLCompact(saldo),
              sub: 'Rendendo agora',
              color: 'text-emerald-400',
              border: 'border-slate-800/70',
              icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
              iconBg: 'bg-slate-800/60 text-slate-400',
            },
            {
              label: 'Total Sacado',
              value: formatBRLCompact(totalSacado),
              sub: 'Saques aprovados',
              color: 'text-amber-400',
              border: 'border-slate-800/70',
              icon: 'M5 10l7-7m0 0l7 7m-7-7v18',
              iconBg: 'bg-amber-500/10 text-amber-400',
            },
            {
              label: 'Plano Atual',
              value: plano,
              sub: `${cdiAnual.toFixed(1)}% a.a.`,
              color: planColor[plano] ?? 'text-white',
              border: 'border-slate-800/70',
              icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
              iconBg: 'bg-amber-500/10 text-amber-400',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 flex flex-col gap-2`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight mb-0.5">{c.label}</p>
                <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                <p className="text-[12px] text-slate-700 mt-1">{c.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Aviso de saldo protegido (só exibe quando há algum) ── */}
        {totalProtected > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-amber-300">Saldo sob proteção de risco</p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                R$ {formatBRL(totalProtected)} do seu saldo está em reserva ou bloqueio de proteção da plataforma.
                {blockedBalance > 0 && <> <span className="text-red-400 font-semibold">R$ {formatBRL(blockedBalance)} bloqueados</span> por disputa/chargeback.</> }
                {futureBalance > 0 && <> <span className="text-blue-400 font-semibold">R$ {formatBRL(futureBalance)} com liberação agendada.</span></>}
                {' '}Entre em contato com o suporte para mais informações.
              </p>
            </div>
            <div className="shrink-0 text-right hidden sm:block">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Total protegido</p>
              <p className="text-[20px] font-bold text-amber-400 tabular-nums">R$ {formatBRL(totalProtected)}</p>
            </div>
          </div>
        )}

        {/* ── Reserva de Risco (detalhes — só exibe quando há algum saldo protegido) ── */}
        {totalProtected > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Saldo Reservado',
                value: reservedBalance,
                color: reservedBalance > 0 ? 'text-amber-400' : 'text-slate-700',
                border: reservedBalance > 0 ? 'border-amber-500/20' : 'border-slate-800/40',
                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                sub: 'reserva de risco da plataforma',
              },
              {
                label: 'Saldo Bloqueado',
                value: blockedBalance,
                color: blockedBalance > 0 ? 'text-red-400' : 'text-slate-700',
                border: blockedBalance > 0 ? 'border-red-500/20' : 'border-slate-800/40',
                icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
                sub: 'chargeback / MED / disputa',
              },
              {
                label: 'Liberação Futura',
                value: futureBalance,
                color: futureBalance > 0 ? 'text-blue-400' : 'text-slate-700',
                border: futureBalance > 0 ? 'border-blue-500/15' : 'border-slate-800/40',
                icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                sub: 'com data prevista de liberação',
              },
            ].map((c) => (
              <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 flex items-center gap-3`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.value > 0 ? 'bg-slate-800/60' : 'bg-slate-800/30'} text-slate-500`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{c.label}</p>
                  <p className={`text-[20px] font-bold tabular-nums leading-tight ${c.color}`}>R$ {formatBRL(c.value)}</p>
                  <p className="text-[12px] text-slate-700 mt-0.5">{c.sub}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Chart + Actions Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[18px] font-semibold text-white">Volume de Entradas</p>
                <p className="text-[13px] text-slate-600 mt-0.5">Vendas + rendimentos CDI no período</p>
              </div>
              {totalRecebido + totalCdiCredits > 0 && (
                <span className="text-[13px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  +{formatBRLCompact(totalRecebido + totalCdiCredits)}
                </span>
              )}
            </div>
            <div className="px-5 pt-4 pb-3">
              {chartData.every(d => d.value === 0) ? (
                <div className="h-[120px] flex items-center justify-center">
                  <p className="text-[11.5px] text-slate-700">Nenhuma entrada no período selecionado</p>
                </div>
              ) : (
                <div className="relative h-[120px]">
                  {/* Y axis max label */}
                  <span className="absolute top-0 left-0 text-[9px] text-slate-700 tabular-nums">{formatBRLCompact(chartMax)}</span>
                  <span className="absolute bottom-5 left-0 text-[9px] text-slate-700">R$ 0</span>
                  {/* Bars */}
                  <div className="ml-10 mr-0 h-[100px] flex items-end gap-[2px]">
                    {chartData.map((d, i) => {
                      const pct = chartMax > 0 ? (d.value / chartMax) * 100 : 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${formatDay(new Date(d.date))}: R$ ${formatBRL(d.value)}`}>
                          <div
                            className="w-full rounded-t-sm transition-all"
                            style={{
                              height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`,
                              background: d.value > 0
                                ? 'linear-gradient(to top, rgba(59,130,246,0.6), rgba(99,102,241,0.5))'
                                : 'rgba(30,41,59,0.4)',
                            }}
                          />
                          {/* tooltip on hover */}
                          {d.value > 0 && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700/60 rounded px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                              {formatBRLCompact(d.value)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* X axis labels — show only first, mid, last */}
                  {chartData.length > 1 && (
                    <div className="ml-10 flex justify-between mt-1">
                      <span className="text-[9px] text-slate-700">{formatDay(new Date(chartData[0].date))}</span>
                      {chartData.length > 2 && (
                        <span className="text-[9px] text-slate-700">{formatDay(new Date(chartData[Math.floor(chartData.length / 2)].date))}</span>
                      )}
                      <span className="text-[9px] text-slate-700">{formatDay(new Date(chartData[chartData.length - 1].date))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions + Saldo */}
          <div className="flex flex-col gap-3">

            {/* Saldo card */}
            <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo Disponível</p>
              <p className="text-[22px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(pendente)}</p>
              <p className="text-[12px] text-slate-600 mt-1.5 mb-3">Disponível para saque ou aporte CDI</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Link href="/cliente/saques" className="flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                  Sacar
                </Link>
                <Link href="/cliente/cdi" className="flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 text-[13px] font-semibold transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                  CDI
                </Link>
              </div>
            </div>

            {/* CDI quick stats */}
            <div className={`border rounded-2xl p-5 ${planBg[plano] ?? 'bg-slate-900/60 border-slate-800/70'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Saldo em CDI</p>
                <span className={`text-[10px] font-bold ${planColor[plano] ?? 'text-white'}`}>{plano}</span>
              </div>
              <p className="text-[20px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(saldo)}</p>
              <div className="mt-3 pt-3 border-t border-slate-800/40 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[11px] text-slate-700 uppercase tracking-wider">Previsto/mês</p>
                  <p className="text-[13px] font-bold text-emerald-400 tabular-nums mt-0.5">
                    {saldo > 0 ? `+R$ ${formatBRL(rendimentoMes)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-700 uppercase tracking-wider">Taxa CDI</p>
                  <p className="text-[13px] font-bold text-white mt-0.5">{cdiRate.toFixed(2)}%/mês</p>
                </div>
              </div>
              {saldo === 0 && (
                <Link href="/cliente/cdi" className="mt-3 block text-center py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/20 text-purple-400 text-[13px] font-semibold hover:bg-purple-600/30 transition-colors">
                  Aportar no CDI →
                </Link>
              )}
            </div>

            {/* Aporte CDI no período */}
            {totalAportadoCdi > 0 && (
              <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">Aportado CDI</p>
                  <p className="text-[14px] font-bold text-white tabular-nums mt-0.5">R$ {formatBRL(totalAportadoCdi)}</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Últimas Movimentações ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[18px] font-semibold text-white">Últimas Movimentações</p>
              <p className="text-[13px] text-slate-600 mt-0.5">
                {recentLogs.length > 0 ? `${recentLogs.length} evento${recentLogs.length !== 1 ? 's' : ''} no período` : 'Nenhuma movimentação no período'}
              </p>
            </div>
            <Link href="/cliente/extrato" className="text-[13px] font-medium text-slate-500 hover:text-blue-400 transition-colors">
              Ver extrato →
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-700">
              <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-[14px] font-medium">Nenhuma movimentação no período</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30">
              {recentLogs.map((log) => {
                const meta   = logMeta[log.action] ?? { label: log.action, sign: '', color: 'text-slate-400', dot: 'bg-slate-800/60 text-slate-500', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
                const amount = getAmount(log.metadata)
                return (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.dot}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-slate-200 truncate">{meta.label}</p>
                      <p className="text-[12px] text-slate-600">{formatDateShort(log.createdAt)}</p>
                    </div>
                    {amount > 0 && (
                      <p className={`text-[14px] font-bold tabular-nums shrink-0 ${meta.color}`}>
                        {meta.sign === '-' ? '−' : meta.sign === '+' ? '+' : ''}R$ {formatBRL(amount)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Bottom row: CDI Simulation + Quick Links ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* CDI Simulation */}
          {saldo > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/60">
                <p className="text-[18px] font-semibold text-white">Simulação CDI</p>
                <p className="text-[13px] text-slate-600 mt-0.5">{cdiRate.toFixed(2)}%/mês · {cdiAnual.toFixed(2)}% a.a.</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-800/40">
                {[{ label: '1 mês', meses: 1 }, { label: '3 meses', meses: 3 }, { label: '6 meses', meses: 6 }, { label: '12 meses', meses: 12 }].map(({ label, meses }) => {
                  const rendimento = saldo * (Math.pow(1 + cdiRate / 100, meses) - 1)
                  return (
                    <div key={label} className="p-4">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{label}</p>
                      <p className="text-[14px] font-bold text-white tabular-nums">R$ {formatBRL(saldo + rendimento)}</p>
                      <p className="text-[12px] text-emerald-400 mt-0.5 tabular-nums">+R$ {formatBRL(rendimento)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-4">
            <p className="text-[18px] font-semibold text-white mb-3">Acesso Rápido</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Transações',    href: '/cliente/transacoes',   icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',    color: 'text-blue-400 bg-blue-500/10' },
                { label: 'Extrato',       href: '/cliente/extrato',      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',          color: 'text-purple-400 bg-purple-500/10' },
                { label: 'Antecipações', href: '/cliente/antecipacoes', icon: 'M13 10V3L4 14h7v7l9-11h-7z',  color: 'text-amber-400 bg-amber-500/10' },
                { label: 'Integrações',  href: '/cliente/integracoes',  icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', color: 'text-slate-300 bg-slate-700/40' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/60 hover:border-slate-700/60 transition-all">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${l.color}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={l.icon} />
                    </svg>
                  </div>
                  <span className="text-[13px] font-medium text-slate-300">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
