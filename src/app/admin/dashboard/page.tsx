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

export default async function AdminDashboardPage() {
  const [activeMerchants, reviewMerchants, recentMerchants, totalMerchants] = await Promise.all([
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.merchant.count({ where: { status: 'REVIEW' } }),
    prisma.merchant.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.merchant.count(),
  ])

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
        subtitle="Acompanhe a operação geral da Master Pagamentos."
        actions={topbarActions}
      />

      <div className="p-5 xl:p-8 space-y-6">

        {/* ── KPIs principais ── */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-700/70 transition-all duration-200">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Volume Transacionado</p>
              <p className="text-[26px] font-bold text-white tabular-nums leading-none">—</p>
              <p className="text-[11px] text-slate-600 mt-2">Disponível em breve</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-700/70 transition-all duration-200">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Receita Bruta</p>
              <p className="text-[26px] font-bold text-white tabular-nums leading-none">—</p>
              <p className="text-[11px] text-slate-600 mt-2">Disponível em breve</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-700/70 transition-all duration-200">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Margem Estimada</p>
              <p className="text-[26px] font-bold text-white tabular-nums leading-none">—%</p>
              <p className="text-[11px] text-slate-600 mt-2">Disponível em breve</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-700/70 transition-all duration-200">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Clientes Ativos</p>
              <p className="text-[26px] font-bold text-white tabular-nums leading-none">{activeMerchants}</p>
              <p className="text-[11px] text-slate-600 mt-2">Merchants com acesso liberado</p>
            </div>

          </div>
        </section>

        {/* ── Resumo operacional ── */}
        <section>
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest">Resumo Operacional</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/60">

              <Link
                href="/admin/clientes?status=REVIEW"
                className="p-5 hover:bg-slate-800/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Em Revisão</p>
                </div>
                <p className="text-2xl font-bold text-amber-400 tabular-nums">{reviewMerchants}</p>
                <p className="text-[11px] text-slate-600 mt-1">Clientes aguardando aprovação</p>
              </Link>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Saques Pendentes</p>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">—</p>
                <p className="text-[11px] text-slate-600 mt-1">Disponível em breve</p>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Chargebacks em Aberto</p>
                </div>
                <p className="text-2xl font-bold text-white tabular-nums">—</p>
                <p className="text-[11px] text-slate-600 mt-1">Disponível em breve</p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Clientes recentes ── */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
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
                    <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentMerchants.map((m, i) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors duration-100 group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                            {getInitials(m.name)}
                          </div>
                          <span className="text-[13px] font-medium text-white">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-md">
                          {typeLabel[m.type] ?? m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant[m.status] ?? 'neutral'}>
                          {statusLabel[m.status] ?? m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-300">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${planDot[m.plan] ?? 'bg-slate-500'}`} />
                          {m.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/clientes/${m.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-blue-400 group-hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
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
        </section>

      </div>
    </div>
  )
}
