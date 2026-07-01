export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { ConfigActionsPanel } from './ConfigActionsPanel'
import packageJson from '../../../../package.json'

const planColor: Record<string, string> = {
  Start:  'bg-slate-400',
  Growth: 'bg-blue-500',
  Prime:  'bg-purple-500',
  Black:  'bg-white',
}
const planDot: Record<string, string> = {
  Start:  'bg-slate-400',
  Growth: 'bg-blue-500',
  Prime:  'bg-purple-500',
  Black:  'bg-slate-100',
}

const quicklinks = [
  {
    label: 'Taxas e Planos',
    href: '/admin/taxas',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    ),
  },
  {
    label: 'CDI e Rendimentos',
    href: '/admin/cdi',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: 'Reserva de Risco',
    href: '/admin/risco',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: 'Master Score',
    href: '/admin/master-score',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    label: 'Integrações / API',
    href: '/admin/integracoes',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Usuários e Permissões',
    href: '/admin/usuarios',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: 'Conciliação',
    href: '/admin/conciliacao',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Análise de Dados',
    href: '/admin/analise',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/15',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const [
    merchantCount,
    activeMerchantCount,
    userCount,
    logCount,
    feePlans,
    merchantsByPlan,
    disputeCount,
    pendingReserves,
    cdiRatesByPlan,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count(),
    prisma.auditLog.count(),
    prisma.feePlan.findMany({ orderBy: { name: 'asc' } }).catch(() => [] as any[]),
    prisma.merchant.groupBy({ by: ['plan'], _count: { id: true }, where: { status: 'ACTIVE' } }).catch(() => [] as any[]),
    prisma.dispute.count({ where: { status: 'ABERTO' } }).catch(() => 0),
    prisma.reserveRelease.count({ where: { status: 'RESERVADO', releaseAt: { lte: new Date() } } }).catch(() => 0),
    prisma.merchant.groupBy({
      by: ['plan'],
      _avg: { cdiRate: true },
      where: { status: 'ACTIVE' },
    }).catch(() => [] as any[]),
  ])

  const planCountMap: Record<string, number> = {}
  for (const row of merchantsByPlan) planCountMap[row.plan] = row._count.id

  const planCdiMap: Record<string, number | null> = {}
  for (const row of cdiRatesByPlan) planCdiMap[row.plan] = row._avg?.cdiRate ?? null

  // Spread alerts
  const badSpreads = feePlans.filter((p: any) => (p.chargedPercent - p.costPercent) <= 0)

  const platformInfo = [
    { label: 'Plataforma',     value: 'Master Pagamentos' },
    { label: 'Versão',         value: `v${packageJson.version}` },
    { label: 'Ambiente',       value: 'Produção' },
    { label: 'Banco de Dados', value: 'PostgreSQL (Neon)' },
    { label: 'Framework',      value: 'Next.js 14 App Router' },
    { label: 'ORM',            value: 'Prisma' },
  ]

  const stats = [
    { label: 'Merchants Ativos', value: activeMerchantCount, color: 'text-white',    border: 'border-slate-800/70' },
    { label: 'Usuários',         value: userCount,           color: 'text-blue-400',  border: 'border-blue-500/20' },
    { label: 'Audit Events',     value: logCount,            color: 'text-purple-400', border: 'border-purple-500/20' },
    { label: 'Disputas Abertas', value: disputeCount,        color: disputeCount > 0 ? 'text-red-400' : 'text-slate-500', border: disputeCount > 0 ? 'border-red-500/20' : 'border-slate-800/70' },
  ]

  const planOrder = ['Start', 'Growth', 'Prime', 'Black']
  const hasAlerts = badSpreads.length > 0 || pendingReserves > 0 || disputeCount > 0

  return (
    <div>
      <Topbar
        title="Configurações"
        breadcrumb="Casa › Gestão"
        subtitle="Central de controle e status da plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPI stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className={`bg-slate-900/60 border ${s.border} rounded-xl p-4 text-center`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{s.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* Platform info + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Informações da Plataforma</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {platformInfo.map((row) => (
                <div key={row.label} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">{row.label}</span>
                  <span className="text-[12px] font-semibold text-slate-200">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Operational alerts */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Alertas Operacionais</p>
              {hasAlerts ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                  {[badSpreads.length > 0, pendingReserves > 0, disputeCount > 0].filter(Boolean).length} alerta{[badSpreads.length > 0, pendingReserves > 0, disputeCount > 0].filter(Boolean).length !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Tudo OK
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-800/40">

              {/* Spread alert */}
              <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${badSpreads.length > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span className="text-[12px] text-slate-300">Spread dos planos</span>
                </div>
                {badSpreads.length > 0 ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-red-400">{badSpreads.length} plano{badSpreads.length !== 1 ? 's' : ''} ≤ 0%</span>
                    <a href="/admin/taxas" className="text-[10px] font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-0.5 rounded-lg transition-colors">
                      Corrigir →
                    </a>
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-semibold shrink-0">Todos positivos</span>
                )}
              </div>

              {/* Reservas vencidas */}
              <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${pendingReserves > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span className="text-[12px] text-slate-300">Reservas vencidas</span>
                </div>
                {pendingReserves > 0 ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-amber-400 tabular-nums">{pendingReserves} pendente{pendingReserves !== 1 ? 's' : ''}</span>
                    <a href="/admin/risco" className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2 py-0.5 rounded-lg transition-colors">
                      Ver →
                    </a>
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-semibold shrink-0">Nenhuma</span>
                )}
              </div>

              {/* Disputas */}
              <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${disputeCount > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span className="text-[12px] text-slate-300">Disputas abertas</span>
                </div>
                {disputeCount > 0 ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-red-400 tabular-nums">{disputeCount} aberta{disputeCount !== 1 ? 's' : ''}</span>
                    <a href="/admin/disputas" className="text-[10px] font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-0.5 rounded-lg transition-colors">
                      Ver →
                    </a>
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-semibold shrink-0">Nenhuma</span>
                )}
              </div>

              {/* Total merchants */}
              <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-slate-500" />
                  <span className="text-[12px] text-slate-300">Total de merchants</span>
                </div>
                <span className="text-[11px] text-slate-400 tabular-nums shrink-0">{activeMerchantCount} ativos / {merchantCount} total</span>
              </div>

            </div>
          </section>

        </div>

        {/* 3-col module summaries */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* FeePlans summary */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Planos de Tarifas</p>
              <a href="/admin/taxas" className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                Gerenciar →
              </a>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <span className="text-[28px] font-bold tabular-nums text-white leading-none">{feePlans.length}</span>
                <span className="text-[11px] text-slate-500 mb-1">plano{feePlans.length !== 1 ? 's' : ''} cadastrado{feePlans.length !== 1 ? 's' : ''}</span>
              </div>
              {feePlans.length > 0 && (
                <div className="space-y-1.5">
                  {feePlans.map((p: any) => {
                    const spread = p.chargedPercent - p.costPercent
                    return (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${planDot[p.name] ?? 'bg-slate-500'}`} />
                          <span className="text-[11.5px] text-slate-300">{p.name}</span>
                        </div>
                        <span className={`text-[11px] font-mono ${spread <= 0 ? 'text-red-400 font-bold' : spread < 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
                          {spread <= 0 && ' ⚠'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
              {feePlans.length === 0 && (
                <p className="text-[11px] text-slate-600">Nenhum plano — crie em Taxas.</p>
              )}
              {badSpreads.length > 0 && (
                <div className="mt-1 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-[10.5px] text-red-400 font-semibold">{badSpreads.length} plano{badSpreads.length !== 1 ? 's' : ''} com spread ≤ 0% — revisar urgente</p>
                </div>
              )}
            </div>
          </section>

          {/* Merchants por plano */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Merchants por Plano</p>
              <a href="/admin/analise" className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                Análise →
              </a>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-[28px] font-bold tabular-nums text-white leading-none">{activeMerchantCount}</span>
                <span className="text-[11px] text-slate-500 mb-1">sellers ativos</span>
              </div>
              {planOrder.map((plan) => {
                const count = planCountMap[plan] ?? 0
                const pct = activeMerchantCount > 0 ? (count / activeMerchantCount) * 100 : 0
                const color = planColor[plan] ?? 'bg-slate-500'
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                        <span className="text-[11.5px] text-slate-300">{plan}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums">{count}</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} opacity-60`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* CDI por plano */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">CDI Médio por Plano</p>
              <a href="/admin/cdi" className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                Gerenciar →
              </a>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-2 mb-4">
                <span className="text-[11px] text-slate-500">Média dos sellers ativos</span>
              </div>
              <div className="space-y-2.5">
                {planOrder.map((plan) => {
                  const avg = planCdiMap[plan]
                  return (
                    <div key={plan} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${planDot[plan] ?? 'bg-slate-500'}`} />
                        <span className="text-[11.5px] text-slate-300">{plan}</span>
                      </div>
                      <span className="text-[11.5px] font-mono text-emerald-400 font-semibold">
                        {avg != null ? `${avg.toFixed(2)}%` : <span className="text-slate-600">—</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

        </div>

        {/* Maintenance actions */}
        <ConfigActionsPanel pendingReserves={pendingReserves as number} />

        {/* Quick links */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Atalhos de Gestão</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Acesso rápido aos módulos do painel</p>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
            {quicklinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${link.bg}`}
              >
                <span className={link.color}>{link.icon}</span>
                <span className={`text-[10.5px] font-semibold text-center leading-tight ${link.color}`}>{link.label}</span>
              </a>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
