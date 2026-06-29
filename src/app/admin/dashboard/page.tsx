export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  REVIEW: 'Em revisão',
  BLOCKED: 'Bloqueado',
  INACTIVE: 'Inativo',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE: 'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-white font-semibold text-base mb-3">{children}</h2>
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
    prisma.merchant.aggregate({
      _sum: { balance: true, pendingBalance: true },
    }),
    prisma.merchant.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.merchant.groupBy({ by: ['plan'], _count: { _all: true }, orderBy: { _count: { plan: 'desc' } } }),
  ])

  const totalBalance = financials._sum.balance ?? 0
  const totalPending = financials._sum.pendingBalance ?? 0

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Visão geral da plataforma" />
      <div className="p-6 space-y-8">

        {/* ── Clientes ── */}
        <section>
          <SectionTitle>Clientes</SectionTitle>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Total de Clientes"
              value={String(totalMerchants)}
              subtitle="Merchants cadastrados"
              accent="blue"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard
              title="Ativos"
              value={String(activeMerchants)}
              subtitle="Com status ATIVO"
              accent="green"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="Em Revisão"
              value={String(reviewMerchants)}
              subtitle="Aguardando aprovação"
              accent="amber"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              title="Bloqueados"
              value={String(blockedMerchants)}
              subtitle="Com acesso suspenso"
              accent="red"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
            />
          </div>
        </section>

        {/* ── Financeiro ── */}
        <section>
          <SectionTitle>Financeiro</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <p className="text-slate-400 text-sm">Saldo em Custódia</p>
              </div>
              <p className="text-2xl font-bold text-white">R$ {formatBRL(totalBalance)}</p>
              <p className="text-slate-500 text-xs mt-1">Soma dos saldos disponíveis</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-slate-400 text-sm">Saldo Pendente Total</p>
              </div>
              <p className="text-2xl font-bold text-white">R$ {formatBRL(totalPending)}</p>
              <p className="text-slate-500 text-xs mt-1">Soma dos saldos a liberar</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                </div>
                <p className="text-slate-400 text-sm">Planos de Taxa</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalPlans}</p>
              <p className="text-slate-500 text-xs mt-1">Planos ativos na plataforma</p>
            </div>
          </div>
        </section>

        {/* ── Clientes recentes + lateral ── */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Clientes recentes */}
          <div className="xl:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-white font-semibold">Clientes Recentes</h3>
              <Link href="/admin/clientes" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Ver todos →
              </Link>
            </div>
            {recentMerchants.length === 0 ? (
              <p className="text-slate-500 text-sm p-6 text-center">Nenhum cliente cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Nome</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Tipo</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Saldo</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMerchants.map((m) => (
                      <tr key={m.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                        <td className="px-4 py-3 text-slate-400">{typeLabel[m.type] ?? m.type}</td>
                        <td className="px-4 py-3">
                          <Badge variant={m.status === 'ACTIVE' ? 'success' : m.status === 'REVIEW' ? 'warning' : 'danger'}>
                            {statusLabel[m.status] ?? m.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-medium text-xs">
                          R$ {formatBRL(m.balance)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/admin/clientes/${m.id}`} className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-4">

            {/* Ações rápidas */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Ações rápidas</h3>
              <div className="flex flex-col gap-2">
                <Link
                  href="/admin/clientes/novo"
                  className="flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Novo cliente
                </Link>
                <Link
                  href="/admin/taxas/novo"
                  className="flex items-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Novo plano de taxa
                </Link>
                <Link
                  href="/admin/clientes?status=REVIEW"
                  className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-semibold rounded-xl border border-amber-500/20 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Ver pendentes ({reviewMerchants})
                </Link>
              </div>
            </div>

            {/* Distribuição por tipo */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Tipo de cliente</h3>
              <div className="flex flex-col gap-2">
                {byType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">{typeLabel[t.type] ?? t.type}</span>
                    <span className="text-white font-semibold text-sm">{t._count._all}</span>
                  </div>
                ))}
                {byType.length === 0 && (
                  <p className="text-slate-500 text-sm">Nenhum dado disponível</p>
                )}
              </div>
            </div>

            {/* Distribuição por plano */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3">Clientes por plano</h3>
              <div className="flex flex-col gap-2">
                {byPlan.map((p) => (
                  <div key={p.plan} className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">
                      {p.plan}
                    </span>
                    <span className="text-white font-semibold text-sm">{p._count._all}</span>
                  </div>
                ))}
                {byPlan.length === 0 && (
                  <p className="text-slate-500 text-sm">Nenhum dado disponível</p>
                )}
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}
