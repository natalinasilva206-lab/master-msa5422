export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'

const statusLabel: Record<string, string> = {
  ACTIVE:   'Ativo',
  REVIEW:   'Em revisão',
  BLOCKED:  'Bloqueado',
  INACTIVE: 'Inativo',
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE:   'success',
  REVIEW:   'warning',
  BLOCKED:  'danger',
  INACTIVE: 'neutral',
}

const planDot: Record<string, string> = {
  Start:  'bg-slate-400',
  Growth: 'bg-blue-400',
  Prime:  'bg-purple-400',
  Black:  'bg-slate-200',
}

const avatarGradients = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
]

const typeLabel: Record<string, string> = {
  ECOMMERCE:    'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatBRLShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace('.', ',')}K`
  return `R$ ${formatBRL(v)}`
}

/* Decorative smooth area chart path (7 data points 0-100) */
function smoothPath(pts: number[], w: number, h: number, pad = 10): string {
  const xs = pts.map((_, i) => pad + (i / (pts.length - 1)) * (w - pad * 2))
  const ys = pts.map((p) => h - pad - (p / 100) * (h - pad * 2))
  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2
    d += ` C ${cx} ${ys[i - 1]}, ${cx} ${ys[i]}, ${xs[i]} ${ys[i]}`
  }
  return d
}


interface PageProps {
  searchParams: { periodo?: string; status?: string }
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const periodo = searchParams?.periodo ?? '7d'
  const statusFilter = searchParams?.status ?? 'todos'

  const daysMap: Record<string, number> = { hoje: 1, '7d': 7, '30d': 30 }
  const days = daysMap[periodo] ?? 7
  const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Wrap all DB calls so a migration-lag error doesn't crash the entire dashboard
  const [activeMerchants, reviewMerchants, recentMerchants, totalMerchants, allMerchants, totalLogs, pendingWithdrawLogs, cdiEarlyLogs, recentSales, recentDisputes, todaySales] =
    await Promise.all([
      prisma.merchant.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
      prisma.merchant.count({ where: { status: 'REVIEW' } }).catch(() => 0),
      prisma.merchant.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }).catch(() => []),
      prisma.merchant.count().catch(() => 0),
      prisma.merchant.findMany({
        select: { id: true, name: true, balance: true, pendingBalance: true, cdiRate: true, plan: true, status: true },
      }).catch(() => []),
      prisma.auditLog.count().catch(() => 0),
      prisma.auditLog.findMany({
        where: { action: 'WITHDRAW_REQUEST' },
        select: { id: true, metadata: true, createdAt: true, entityId: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []),
      prisma.auditLog.findMany({
        where: { action: 'CDI_EARLY_REQUEST' },
        select: { id: true, metadata: true, entityId: true },
      }).catch(() => []),
      prisma.saleLog.findMany({
        where: {
          type: 'VENDA',
          ...(statusFilter === 'pagos' ? { status: 'APROVADO' } : statusFilter === 'pendentes' ? { status: 'PENDENTE' } : {}),
          createdAt: { gte: sevenDaysAgo },
        },
        select: { amount: true, createdAt: true },
      }).catch(() => []),
      prisma.dispute.findMany({
        where: { status: { notIn: ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { merchant: { select: { name: true } } },
      }).catch(() => []),
      prisma.saleLog.aggregate({
        where: { type: 'VENDA', status: 'APROVADO', createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
    ])

  const resolvedWithdrawIds = new Set(
    (await prisma.auditLog.findMany({
      where: { action: { in: ['WITHDRAW_APPROVED', 'WITHDRAW_DENIED'] } },
      select: { metadata: true },
    }).catch(() => [])).flatMap((l) => { try { return [JSON.parse(l.metadata ?? '{}').requestLogId] } catch { return [] } }).filter(Boolean)
  )
  const unresolvedPendingLogs = (pendingWithdrawLogs as any[]).filter((l) => {
    try { return !JSON.parse(l.metadata ?? '{}').resolved } catch { return true }
  }).filter((l: any) => !resolvedWithdrawIds.has(l.id))

  const resolvedCdiEarlyIds = new Set(
    (await prisma.auditLog.findMany({
      where: { action: { in: ['CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED'] } },
      select: { metadata: true },
    }).catch(() => [])).flatMap((l) => { try { const m = JSON.parse(l.metadata ?? '{}'); return m.requestId ? [m.requestId] : [] } catch { return [] } })
  )
  const pendingCdiEarly = (cdiEarlyLogs as any[]).filter((l: any) => !resolvedCdiEarlyIds.has(l.id))

  const totalBalance    = allMerchants.reduce((s, m) => s + m.balance, 0)
  const totalPending    = allMerchants.reduce((s, m) => s + m.pendingBalance, 0)
  const lucroHoje       = todaySales._sum.amount ?? 0
  const topSellers = [...allMerchants]
    .filter((m) => m.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
  const maxBalance = topSellers[0]?.balance ?? 1

  // Build 7-day volume chart from real SaleLog data
  const dayVolumes: number[] = []
  const dayLabels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStr = d.toISOString().slice(0, 10)
    const vol = (recentSales as any[])
      .filter((s: any) => s.createdAt.toISOString().slice(0, 10) === dateStr)
      .reduce((sum: number, s: any) => sum + s.amount, 0)
    dayVolumes.push(vol)
    dayLabels.push(d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }))
  }
  const maxVol = Math.max(...dayVolumes, 1)
  const chartPtsReal = dayVolumes.map((v) => Math.round((v / maxVol) * 90) + 5)
  const W2 = 500, H2 = 120
  const linePathReal = smoothPath(chartPtsReal, W2, H2)
  const areaPathReal = linePathReal + ` L ${W2 - 10} ${H2 - 10} L 10 ${H2 - 10} Z`

  const topbarActions = (
    <div className="flex items-center gap-1.5">
      <a href="/admin/dashboard" className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-200 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Atualizar
      </a>
      <a href="/admin/faturamento" className="flex items-center gap-1.5 text-[13px] text-slate-300 hover:text-white px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exportar
      </a>
    </div>
  )

  return (
    <div>
      <Topbar
        title="Painel"
        breadcrumb="Casa › Administração"
        actions={topbarActions}
        lucroHoje={lucroHoje}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* ── Filtros ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-slate-900/70 border border-slate-800/70 rounded-xl p-1">
            {[
              { label: 'Hoje',   value: 'hoje' },
              { label: '7 dias', value: '7d' },
              { label: '30 dias',value: '30d' },
            ].map(({ label, value }) => (
              <Link
                key={value}
                href={`/admin/dashboard?periodo=${value}&status=${statusFilter}`}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  periodo === value
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-0.5 bg-slate-900/70 border border-slate-800/70 rounded-xl p-1">
            {[
              { label: 'Todos',     value: 'todos' },
              { label: 'Pagos',     value: 'pagos' },
              { label: 'Pendentes', value: 'pendentes' },
            ].map(({ label, value }) => (
              <Link
                key={value}
                href={`/admin/dashboard?periodo=${periodo}&status=${value}`}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  statusFilter === value
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Saldo Disponível Total */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Disponível</p>
                <p className="text-[20px] font-bold text-amber-400 tabular-nums leading-none">{formatBRLShort(totalPending)}</p>
                <p className="text-[12px] text-slate-600 mt-1.5">saldo disponível dos sellers</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 ml-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Empresas Ativas */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 hover:bg-slate-800/40 transition-colors">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Empresas Ativas</p>
                <p className="text-[20px] font-bold text-white tabular-nums leading-none">{activeMerchants}</p>
                <p className="text-[12px] text-slate-600 mt-1.5">{totalMerchants} total cadastradas</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 ml-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pendências */}
          <div className={`rounded-xl p-5 transition-colors border ${(unresolvedPendingLogs.length + pendingCdiEarly.length) > 0 ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10' : 'bg-slate-900/60 border-slate-800/70 hover:bg-slate-800/40'}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Pendências</p>
                <p className={`text-[20px] font-bold tabular-nums leading-none ${(unresolvedPendingLogs.length + pendingCdiEarly.length) > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {unresolvedPendingLogs.length + pendingCdiEarly.length}
                </p>
                <p className="text-[12px] text-slate-600 mt-1.5">
                  {unresolvedPendingLogs.length} saques · {pendingCdiEarly.length} resgates CDI
                </p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${(unresolvedPendingLogs.length + pendingCdiEarly.length) > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800/60 text-slate-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* KYC em revisão */}
          <div className={`rounded-xl p-5 transition-colors border ${reviewMerchants > 0 ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10' : 'bg-slate-900/60 border-slate-800/70 hover:bg-slate-800/40'}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">KYC em Revisão</p>
                <p className={`text-[20px] font-bold tabular-nums leading-none ${reviewMerchants > 0 ? 'text-amber-400' : 'text-white'}`}>{reviewMerchants}</p>
                <p className="text-[12px] text-slate-600 mt-1.5">
                  {reviewMerchants > 0 ? `${reviewMerchants} seller${reviewMerchants !== 1 ? 's' : ''} aguardando` : 'Nenhum em revisão'}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${reviewMerchants > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800/60 text-slate-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Saldo Merchants */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 hover:bg-slate-800/40 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo Merchants</p>
                <p className="text-[20px] font-bold text-emerald-400 tabular-nums leading-none">{formatBRLShort(totalBalance)}</p>
                <Link href="/admin/cdi" className="text-[12px] text-slate-600 group-hover:text-blue-400 mt-1.5 block transition-colors">
                  Clique para ver detalhes
                </Link>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 ml-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

        </section>

        {/* ── Gráfico + Principais Empresas ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Gráfico area/line */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[18px] font-semibold text-white">Volume de Transações</p>
                <p className="text-[13px] text-slate-600 mt-0.5">Últimos 7 dias · volume de vendas aprovadas</p>
              </div>
              <a href="/admin/analise" className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-blue-400 transition-colors font-medium">
                Ver relatório
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div className="px-5 pt-3 pb-0 relative">
              {/* Y-axis labels */}
              <div className="absolute left-5 top-3 flex flex-col justify-between h-[110px] pointer-events-none">
                {[
                  formatBRLShort(maxVol),
                  formatBRLShort(maxVol * 0.75),
                  formatBRLShort(maxVol * 0.5),
                  formatBRLShort(maxVol * 0.25),
                  'R$ 0',
                ].map((l, i) => (
                  <span key={i} className="text-[10px] text-slate-700 font-mono leading-none">{l}</span>
                ))}
              </div>
              {/* SVG chart */}
              <svg
                viewBox={`0 0 ${W2} ${H2}`}
                className="w-full"
                style={{ height: 120 }}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((f, i) => (
                  <line
                    key={i}
                    x1={10}
                    y1={10 + f * (H2 - 20)}
                    x2={W2 - 10}
                    y2={10 + f * (H2 - 20)}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                ))}
                {/* Area fill */}
                <path d={areaPathReal} fill="url(#areaGrad)" />
                {/* Line */}
                <path d={linePathReal} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
                {/* Dots */}
                {chartPtsReal.map((p, i) => {
                  const x = 10 + (i / (chartPtsReal.length - 1)) * (W2 - 20)
                  const y = 10 + (1 - p / 100) * (H2 - 20)
                  return (
                    <circle key={i} cx={x} cy={y} r={3} fill="#3b82f6" stroke="#080c12" strokeWidth={1.5} />
                  )
                })}
              </svg>
            </div>
            {/* X-axis */}
            <div className="px-5 pb-3 flex justify-between">
              {dayLabels.map((d) => (
                <span key={d} className="text-[12px] text-slate-700 font-medium">{d}</span>
              ))}
            </div>
          </div>

          {/* Principais Empresas */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-[18px] font-semibold text-white">Principais Empresas</p>
              <Link
                href="/admin/cdi"
                className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-blue-400 transition-colors font-medium"
              >
                Ver todas
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            {topSellers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <p className="text-[12px]">Nenhum saldo cadastrado</p>
                <Link href="/admin/cdi" className="text-[11px] text-blue-500 mt-1 hover:text-blue-400">Configurar saldos →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {topSellers.map((m, i) => {
                  const pct = (m.balance / maxBalance) * 100
                  return (
                    <div key={m.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold text-slate-700 w-3 shrink-0 tabular-nums">{i + 1}</span>
                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${avatarGradients[i]} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>
                          {getInitials(m.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-slate-200 truncate">{m.name}</p>
                          <p className="text-[12px] text-slate-600">{m.plan} plan</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[12px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(m.balance)}</p>
                          <p className="text-[12px] text-slate-600">{m.cdiRate.toFixed(1)}%/mês</p>
                        </div>
                      </div>
                      <div className="ml-[46px] mt-1.5 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </section>

        {/* ── Saques + Chargebacks ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className={`rounded-xl overflow-hidden border ${unresolvedPendingLogs.length > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/60 border-slate-800/70'}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${unresolvedPendingLogs.length > 0 ? 'border-emerald-500/15' : 'border-slate-800/60'}`}>
              <div>
                <p className="text-[18px] font-semibold text-white">Saques Pendentes</p>
                <p className="text-[13px] text-slate-600 mt-0.5">Aguardando aprovação admin</p>
              </div>
              <div className="flex items-center gap-2">
                {unresolvedPendingLogs.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {unresolvedPendingLogs.length} pendente{unresolvedPendingLogs.length !== 1 ? 's' : ''}
                  </span>
                )}
                <Link href="/admin/saques" className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-blue-400 transition-colors font-medium">
                  Ver todos
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            {unresolvedPendingLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-700">
                <svg className="w-9 h-9 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[14px] font-medium">Nenhum saque pendente</p>
                <p className="text-[13px] text-slate-800 mt-0.5">Tudo em dia.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {unresolvedPendingLogs.slice(0, 5).map((log) => {
                  let amount = 0
                  try { amount = parseFloat(JSON.parse(log.metadata ?? '{}').amount || 0) } catch {}
                  return (
                    <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-slate-200 truncate">{log.user.name ?? log.user.email}</p>
                        <p className="text-[12px] text-slate-600">
                          {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(log.createdAt))}
                        </p>
                      </div>
                      <p className="text-[14px] font-bold text-white tabular-nums shrink-0">R$ {formatBRL(amount)}</p>
                    </div>
                  )
                })}
                {unresolvedPendingLogs.length > 5 && (
                  <div className="px-5 py-2.5">
                    <Link href="/admin/saques" className="text-[13px] font-medium text-slate-600 hover:text-blue-400 transition-colors">
                      +{unresolvedPendingLogs.length - 5} mais → Aprovar na página de Saques
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`rounded-xl overflow-hidden border ${recentDisputes.length > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/60 border-slate-800/70'}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${recentDisputes.length > 0 ? 'border-red-500/15' : 'border-slate-800/60'}`}>
              <div>
                <p className="text-[18px] font-semibold text-white">Chargebacks Recentes</p>
                <p className="text-[13px] text-slate-600 mt-0.5">Disputas em andamento</p>
              </div>
              <div className="flex items-center gap-2">
                {recentDisputes.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {recentDisputes.length} ativa{recentDisputes.length !== 1 ? 's' : ''}
                  </span>
                )}
                <Link href="/admin/disputas" className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-blue-400 transition-colors font-medium">
                  Ver todas
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            {recentDisputes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-700">
                <svg className="w-9 h-9 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[14px] font-medium">Nenhum chargeback ativo</p>
                <p className="text-[13px] text-slate-800 mt-0.5">Disputas abertas aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {recentDisputes.map((d) => (
                  <div key={d.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-slate-200 truncate">{d.merchant.name}</p>
                      <p className="text-[12px] text-slate-600">{d.type} · {d.status}</p>
                    </div>
                    <p className="text-[14px] font-bold text-red-400 tabular-nums shrink-0">R$ {formatBRL(d.contestedAmount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

        {/* ── Sellers recentes ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[18px] font-semibold text-white">Sellers recentes</p>
              <p className="text-[13px] text-slate-600 mt-0.5">Últimos {recentMerchants.length} cadastros</p>
            </div>
            <Link
              href="/admin/clientes"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-500 hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
            >
              Ver todos
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {recentMerchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <p className="text-[13px]">Nenhum cliente cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[12px] font-bold text-slate-600 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-4 py-2.5 text-[12px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                    <th className="text-left px-4 py-2.5 text-[12px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-[12px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Plano</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {recentMerchants.map((m, i) => (
                    <tr key={m.id} className="hover:bg-slate-800/25 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                            {getInitials(m.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-white truncate">{m.name}</p>
                            <p className="text-[12px] text-slate-600 truncate">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
                          {typeLabel[m.type] ?? m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[m.status] ?? 'neutral'}>
                          {statusLabel[m.status] ?? m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-400">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${planDot[m.plan] ?? 'bg-slate-500'}`} />
                          {m.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/clientes/${m.id}`}
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-blue-400 group-hover:text-slate-400 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                        >
                          Ver
                          <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-2.5 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-[13px] text-slate-700">
                  {recentMerchants.length} de {totalMerchants} sellers
                </span>
                <Link href="/admin/clientes" className="text-[13px] font-medium text-slate-600 hover:text-blue-400 transition-colors">
                  Ver lista completa →
                </Link>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
