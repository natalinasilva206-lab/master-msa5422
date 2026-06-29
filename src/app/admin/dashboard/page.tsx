export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'

const statusLabel: Record<string, string> = {
  ACTIVE:   'Ativo',
  REVIEW:   'Em revisão',
  BLOCKED:  'Bloqueado',
  INACTIVE: 'Inativo',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE:    'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

const planDot: Record<string, string> = {
  Start:   'bg-slate-400',
  Growth:  'bg-blue-400',
  Prime:   'bg-purple-400',
  Black:   'bg-slate-200',
  Básico:  'bg-slate-400',
  Premium: 'bg-amber-400',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const avatarGradients = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600',
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
      {children}
    </p>
  )
}

export default async function AdminDashboardPage() {
  const [
    totalMerchants,
    activeMerchants,
    reviewMerchants,
    blockedMerchants,
    totalPlans,
    recentMerchants,
    financials,
    byType,
    byPlan,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.merchant.count({ where: { status: 'REVIEW' } }),
    prisma.merchant.count({ where: { status: 'BLOCKED' } }),
    prisma.feePlan.count(),
    prisma.merchant.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.merchant.aggregate({ _sum: { balance: true, pendingBalance: true } }),
    prisma.merchant.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.merchant.groupBy({ by: ['plan'], _count: { _all: true }, orderBy: { _count: { plan: 'desc' } } }),
  ])

  const totalBalance = financials._sum.balance ?? 0
  const totalPending = financials._sum.pendingBalance ?? 0

  const topbarActions = (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-slate-400 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg font-medium">
        Este mês
      </span>
      <button className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-200 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Atualizar
      </button>
      <button className="flex items-center gap-1.5 text-[12px] text-slate-300 hover:text-white px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exportar
      </button>
    </div>
  )

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle="Acompanhe clientes, saldos e a operação financeira da plataforma."
        actions={topbarActions}
      />

      <div className="p-5 xl:p-8 space-y-6 xl:space-y-8">

        {/* ── Visão geral dos clientes ── */}
        <section>
          <SectionLabel>Visão geral</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total de Clientes"
              value={String(totalMerchants)}
              subtitle="Merchants cadastrados"
              accent="blue"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <StatCard
              title="Ativos"
              value={String(activeMerchants)}
              subtitle="Com acesso liberado"
              accent="green"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Em Revisão"
              value={String(reviewMerchants)}
              subtitle="Aguardando aprovação"
              accent="amber"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Bloqueados"
              value={String(blockedMerchants)}
              subtitle="Com acesso suspenso"
              accent="red"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
            />
          </div>
        </section>

        {/* ── Financeiro ── */}
        <section>
          <SectionLabel>Financeiro</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Saldo em custódia — destaque principal */}
            <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-slate-800/40 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-wider">Disponível</span>
              </div>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo em Custódia</p>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">R$ {formatBRL(totalBalance)}</p>
              <p className="text-[11px] text-slate-600 mt-2">Soma dos saldos disponíveis</p>
            </div>

            {/* Saldo pendente */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-700/70 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[10px] font-semibold text-amber-500/60 uppercase tracking-wider">Pendente</span>
              </div>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo Pendente</p>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">R$ {formatBRL(totalPending)}</p>
              <p className="text-[11px] text-slate-600 mt-2">Aguardando liberação</p>
            </div>

            {/* Planos */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-700/70 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
                <Link href="/admin/taxas" className="text-[10px] font-semibold text-purple-500/60 hover:text-purple-400 uppercase tracking-wider transition-colors">
                  Gerenciar →
                </Link>
              </div>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Planos de Taxa</p>
              <p className="text-2xl font-bold text-white tabular-nums">{totalPlans}</p>
              <p className="text-[11px] text-slate-600 mt-2">Planos cadastrados</p>
            </div>

          </div>
        </section>

        {/* ── Tabela + coluna direita ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Clientes recentes */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Clientes recentes</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Últimos {recentMerchants.length} merchants cadastrados</p>
              </div>
              <Link
                href="/admin/clientes"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-400 hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
              >
                Ver todos
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {recentMerchants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-600">
                <svg className="w-8 h-8 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-[13px]">Nenhum cliente cadastrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/80">
                      <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                      <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Saldo</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentMerchants.map((m, i) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition-colors duration-100 group">
                        {/* Nome + avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                              {getInitials(m.name)}
                            </div>
                            <span className="text-[13px] font-medium text-white">{m.name}</span>
                          </div>
                        </td>
                        {/* Tipo */}
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-md">
                            {typeLabel[m.type] ?? m.type}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <Badge variant={m.status === 'ACTIVE' ? 'success' : m.status === 'REVIEW' ? 'warning' : 'danger'}>
                            {statusLabel[m.status] ?? m.status}
                          </Badge>
                        </td>
                        {/* Saldo */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                            R$ {formatBRL(m.balance)}
                          </span>
                        </td>
                        {/* Ver */}
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/admin/clientes/${m.id}`}
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-blue-400 group-hover:text-slate-300 transition-colors"
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
                <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">
                    Exibindo {recentMerchants.length} de {totalMerchants} cliente{totalMerchants !== 1 ? 's' : ''}
                  </span>
                  <Link
                    href="/admin/clientes"
                    className="text-[11px] font-medium text-slate-500 hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
                  >
                    Ver lista completa →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita */}
          <div className="flex flex-col gap-4">

            {/* Ações rápidas */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Ações rápidas</p>
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/admin/clientes/novo"
                  className="flex items-center gap-3 px-3.5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
                >
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="flex-1">Novo cliente</span>
                  <svg className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href="/admin/taxas/novo"
                  className="flex items-center gap-3 px-3.5 py-3 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white text-[13px] font-medium rounded-lg border border-slate-700/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-700/80 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01" />
                    </svg>
                  </div>
                  <span className="flex-1">Novo plano de taxa</span>
                  <svg className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {reviewMerchants > 0 && (
                  <Link
                    href="/admin/clientes?status=REVIEW"
                    className="flex items-center gap-3 px-3.5 py-3 bg-amber-500/8 hover:bg-amber-500/15 text-amber-400 text-[13px] font-medium rounded-lg border border-amber-500/20 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
                  >
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="flex-1">Pendentes</span>
                    <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md">
                      {reviewMerchants}
                    </span>
                  </Link>
                )}
              </div>
            </div>

            {/* Tipo de cliente */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Tipo de cliente</p>
              {byType.length === 0 ? (
                <p className="text-[12px] text-slate-600">Nenhum dado disponível</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {byType.map((t) => {
                    const pct = totalMerchants > 0 ? Math.round((t._count._all / totalMerchants) * 100) : 0
                    return (
                      <div key={t.type}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] font-medium text-slate-300">{typeLabel[t.type] ?? t.type}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">{pct}%</span>
                            <span className="text-[13px] font-semibold text-white">{t._count._all}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Clientes por plano */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Por plano</p>
              {byPlan.length === 0 ? (
                <p className="text-[12px] text-slate-600">Nenhum dado disponível</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {byPlan.map((p) => (
                    <div key={p.plan} className="flex items-center gap-3 py-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${planDot[p.plan] ?? 'bg-slate-500'}`} />
                      <span className="flex-1 text-[12px] font-medium text-slate-300">{p.plan}</span>
                      <span className="text-[12px] font-semibold text-white tabular-nums">{p._count._all}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}
