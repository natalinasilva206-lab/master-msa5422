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
  Start:   'bg-slate-400',
  Growth:  'bg-blue-400',
  Prime:   'bg-purple-400',
  Black:   'bg-slate-200',
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

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const typeLabel: Record<string, string> = {
  ECOMMERCE:    'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

export default async function AdminDashboardPage() {
  const [activeMerchants, reviewMerchants, recentMerchants, totalMerchants, allMerchants] =
    await Promise.all([
      prisma.merchant.count({ where: { status: 'ACTIVE' } }),
      prisma.merchant.count({ where: { status: 'REVIEW' } }),
      prisma.merchant.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.merchant.count(),
      prisma.merchant.findMany({ select: { id: true, name: true, balance: true, cdiRate: true, plan: true, status: true } }),
    ])

  const totalBalance = allMerchants.reduce((s, m) => s + m.balance, 0)
  const totalRendimento = allMerchants.reduce((s, m) => s + m.balance * (m.cdiRate / 100), 0)
  const topSellers = [...allMerchants]
    .filter((m) => m.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)
  const maxBalance = topSellers[0]?.balance ?? 1

  const topbarActions = (
    <div className="flex items-center gap-2">
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

      <div className="p-5 xl:p-8 space-y-5">

        {/* ── Filtros de período ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 rounded-xl p-1">
            {['Hoje', '7 dias', '30 dias', 'Personalizado'].map((label) => (
              <button
                key={label}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                  label === '7 dias'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 rounded-xl p-1">
            {['Todos', 'Pagos', 'Pendentes'].map((label) => (
              <button
                key={label}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                  label === 'Todos'
                    ? 'bg-slate-700/80 text-slate-200'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPIs ── */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Volume Processado */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 hover:bg-slate-800/40 hover:border-slate-700/60 transition-all duration-200 group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-[10px] text-slate-700 font-medium uppercase tracking-wider">em breve</span>
            </div>
            <p className="text-[22px] font-bold text-white tabular-nums leading-none">—</p>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mt-2">Volume Processado</p>
          </div>

          {/* Sellers Ativos */}
          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-4 hover:bg-slate-800/40 hover:border-emerald-500/30 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">+{activeMerchants}</span>
            </div>
            <p className="text-[22px] font-bold text-emerald-400 tabular-nums leading-none">{totalMerchants}</p>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mt-2">Sellers Totais</p>
          </div>

          {/* Saldo em Custódia */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 hover:bg-slate-800/40 hover:border-slate-700/60 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-[18px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(totalBalance)}</p>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mt-2">Saldo em Custódia</p>
          </div>

          {/* Rendimento CDI */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 hover:bg-slate-800/40 hover:border-slate-700/60 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-[18px] font-bold text-amber-400 tabular-nums leading-none">R$ {formatBRL(totalRendimento)}</p>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mt-2">Rendimento CDI/mês</p>
          </div>

          {/* Em Revisão */}
          <div className={`bg-slate-900/50 border rounded-xl p-4 hover:bg-slate-800/40 transition-all duration-200 ${reviewMerchants > 0 ? 'border-amber-500/20 hover:border-amber-500/30' : 'border-slate-800/80'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reviewMerchants > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800/60 text-slate-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              {reviewMerchants > 0 && (
                <span className="flex h-2 w-2 relative mt-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>
            <p className={`text-[22px] font-bold tabular-nums leading-none ${reviewMerchants > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{reviewMerchants}</p>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mt-2">Em Revisão</p>
          </div>

        </section>

        {/* ── Gráfico + Top Sellers ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Gráfico de volume (decorativo) */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Volume de Transações</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Últimos 7 dias · dados demonstrativos</p>
              </div>
              <span className="text-[10.5px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full font-medium">
                Em desenvolvimento
              </span>
            </div>
            <div className="px-5 pt-4 pb-2">
              {/* Decorative SVG area chart */}
              <div className="flex items-end gap-1 h-[120px] mb-2">
                {[38, 55, 42, 70, 58, 85, 62].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/60 to-blue-400/30 border-t border-blue-500/40 transition-all duration-500"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
                  <span key={d} className="flex-1 text-center text-[10px] text-slate-700 font-medium">{d}</span>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-800/60 grid grid-cols-3 divide-x divide-slate-800/60">
              <div className="pr-4">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Pico</p>
                <p className="text-[13px] font-bold text-white mt-0.5">Sábado</p>
              </div>
              <div className="px-4">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Aprovação</p>
                <p className="text-[13px] font-bold text-emerald-400 mt-0.5">—%</p>
              </div>
              <div className="pl-4">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Chargebacks</p>
                <p className="text-[13px] font-bold text-white mt-0.5">—</p>
              </div>
            </div>
          </div>

          {/* Top Sellers */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Principais Sellers</p>
              <Link
                href="/admin/cdi"
                className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors font-medium"
              >
                Ver CDI →
              </Link>
            </div>
            {topSellers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-700">
                <p className="text-[12px]">Nenhum saldo cadastrado</p>
                <Link href="/admin/cdi" className="text-[11px] text-blue-500 mt-1 hover:text-blue-400">Configurar CDI →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {topSellers.map((m, i) => {
                  const pct = maxBalance > 0 ? (m.balance / maxBalance) * 100 : 0
                  return (
                    <div key={m.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-[11px] font-bold text-slate-600 w-4 shrink-0 tabular-nums">{i + 1}</span>
                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>
                          {getInitials(m.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-white truncate">{m.name}</p>
                        </div>
                        <p className="text-[11.5px] font-semibold text-emerald-400 tabular-nums shrink-0">
                          R$ {formatBRL(m.balance)}
                        </p>
                      </div>
                      <div className="ml-[26px] h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
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

        {/* ── Saques Pendentes + Chargebacks ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Saques Pendentes */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <p className="text-[13px] font-semibold text-white">Saques Pendentes</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">0 pendentes</span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-slate-700">
              <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-[12px] font-medium">Nenhum saque pendente</p>
              <p className="text-[11px] text-slate-800 mt-0.5">Módulo em desenvolvimento</p>
            </div>
          </div>

          {/* Chargebacks Recentes */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-[13px] font-semibold text-white">Chargebacks Recentes</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider">0 abertos</span>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-slate-700">
              <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[12px] font-medium">Nenhum chargeback aberto</p>
              <p className="text-[11px] text-slate-800 mt-0.5">Módulo em desenvolvimento</p>
            </div>
          </div>

        </section>

        {/* ── Clientes recentes ── */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Sellers recentes</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Últimos {recentMerchants.length} cadastros</p>
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
              <p className="text-[13px]">Nenhum cliente cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/80">
                    <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Plano</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentMerchants.map((m, i) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors duration-100 group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                            {getInitials(m.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-white truncate">{m.name}</p>
                            <p className="text-[11px] text-slate-600 truncate">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-md">
                          {typeLabel[m.type] ?? m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant[m.status] ?? 'neutral'}>
                          {statusLabel[m.status] ?? m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-slate-300">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${planDot[m.plan] ?? 'bg-slate-500'}`} />
                          {m.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/clientes/${m.id}`}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-600 hover:text-blue-400 group-hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
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
                  {recentMerchants.length} de {totalMerchants} seller{totalMerchants !== 1 ? 's' : ''}
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
