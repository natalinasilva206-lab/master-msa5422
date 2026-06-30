export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import { CdiRateInput } from './CdiRateInput'
import { BalanceInput } from './BalanceInput'
import { GlobalRateForm } from './GlobalRateForm'

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

const avatarGradients = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600',
]

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function anualizarTaxa(mensal: number) {
  return (Math.pow(1 + mensal / 100, 12) - 1) * 100
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default async function CdiPage() {
  const merchants = await prisma.merchant.findMany({
    orderBy: { balance: 'desc' },
  })

  const totalBalance = merchants.reduce((s, m) => s + m.balance, 0)
  const totalRendimento = merchants.reduce((s, m) => s + m.balance * (m.cdiRate / 100), 0)
  const totalActive = merchants.filter((m) => m.status === 'ACTIVE').length
  const avgRate = merchants.length > 0
    ? merchants.reduce((s, m) => s + m.cdiRate, 0) / merchants.length
    : 0
  const maxBalance = merchants.reduce((mx, m) => Math.max(mx, m.balance), 1)

  // Count per plan for GlobalRateForm
  const merchantCounts: Record<string, number> = {}
  for (const m of merchants) {
    merchantCounts[m.plan] = (merchantCounts[m.plan] ?? 0) + 1
  }

  return (
    <div>
      <Topbar
        title="CDI e Rendimentos"
        breadcrumb="Casa › Financeiro"
        subtitle="Gerencie a taxa de rendimento CDI por conta de seller."
      />

      <div className="p-5 xl:p-8 space-y-6">

        {/* ── Resumo geral ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Total de Sellers</p>
            <p className="text-[28px] font-bold text-white tabular-nums leading-none">{merchants.length}</p>
            <p className="text-[11px] text-slate-600 mt-2">{totalActive} ativos</p>
          </div>

          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-5 hover:bg-slate-800/40 hover:border-emerald-500/30 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo Total em Custódia</p>
            <p className="text-[26px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(totalBalance)}</p>
            <p className="text-[11px] text-slate-600 mt-2">Total em CDI rendendo</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Rendimento Est. / Mês</p>
            <p className="text-[26px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(totalRendimento)}</p>
            <p className="text-[11px] text-slate-600 mt-2">Projeção com taxas atuais</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Taxa Média CDI</p>
            <p className="text-[26px] font-bold text-amber-400 tabular-nums leading-none">{avgRate.toFixed(2)}%</p>
            <p className="text-[11px] text-slate-600 mt-2">Média entre todos os sellers</p>
          </div>

        </section>

        {/* ── Taxa Global ── */}
        <GlobalRateForm merchantCounts={merchantCounts} />

        {/* ── Tabela de sellers ── */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Sellers cadastrados</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clique no saldo ou na taxa para editar · Enter confirma · Esc cancela
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edição inline
              </span>
            </div>
          </div>

          {merchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <svg className="w-8 h-8 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-[13px]">Nenhum seller cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/80">
                    <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
                    <th className="text-right px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                      Saldo em CDI
                      <span className="ml-1 text-slate-700 normal-case tracking-normal font-normal">(editável)</span>
                    </th>
                    <th className="text-center px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                      Taxa CDI / mês
                    </th>
                    <th className="text-center px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Equiv. anual</th>
                    <th className="text-right px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Rend. 12m</th>
                    <th className="text-right px-5 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Rend. / mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {merchants.map((m, i) => {
                    const rendimento = m.balance * (m.cdiRate / 100)
                    const rend12m = m.balance * (Math.pow(1 + m.cdiRate / 100, 12) - 1)
                    const anual = anualizarTaxa(m.cdiRate)
                    const balancePct = totalBalance > 0 ? (m.balance / maxBalance) * 100 : 0
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/20 transition-colors duration-100">

                        {/* Seller */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                              {getInitials(m.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-white truncate">{m.name}</p>
                              <p className="text-[11px] text-slate-500">{m.email}</p>
                              {m.balance > 0 && (
                                <div className="mt-1.5 w-28 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full transition-all" style={{ width: `${balancePct}%` }} />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <Badge variant={statusVariant[m.status] ?? 'neutral'}>
                            {statusLabel[m.status] ?? m.status}
                          </Badge>
                        </td>

                        {/* Plano */}
                        <td className="px-4 py-4">
                          <span className="text-[12px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">
                            {m.plan}
                          </span>
                        </td>

                        {/* Saldo editável */}
                        <td className="px-4 py-4 text-right">
                          <BalanceInput merchantId={m.id} initialBalance={m.balance} />
                        </td>

                        {/* Taxa CDI editável */}
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <CdiRateInput merchantId={m.id} initialRate={m.cdiRate} />
                          </div>
                        </td>

                        {/* Equivalente anual */}
                        <td className="px-4 py-4 text-center hidden lg:table-cell">
                          <span className="text-[12px] font-semibold text-slate-400 tabular-nums">
                            {anual.toFixed(2)}% a.a.
                          </span>
                        </td>

                        {/* Rendimento 12 meses */}
                        <td className="px-4 py-4 text-right hidden xl:table-cell">
                          <span className={`text-[12px] font-semibold tabular-nums ${rend12m > 0 ? 'text-emerald-400' : 'text-slate-700'}`}>
                            {rend12m > 0 ? `+R$ ${formatBRL(rend12m)}` : '—'}
                          </span>
                        </td>

                        {/* Rendimento mensal */}
                        <td className="px-5 py-4 text-right">
                          <div>
                            <p className="text-[13px] font-semibold text-slate-300 tabular-nums">
                              R$ {formatBRL(rendimento)}
                            </p>
                            {m.balance > 0 && (
                              <p className="text-[10.5px] text-slate-600 mt-0.5">
                                {m.cdiRate.toFixed(2)}% × R$ {formatBRL(m.balance)}
                              </p>
                            )}
                          </div>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700/60 bg-slate-900/30">
                    <td colSpan={3} className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-[11px] text-slate-600">
                        {merchants.length} seller{merchants.length !== 1 ? 's' : ''} cadastrado{merchants.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">
                        R$ {formatBRL(totalBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[11.5px] font-semibold text-amber-400">{avgRate.toFixed(2)}% avg</span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                      <span className="text-[11.5px] font-semibold text-slate-500">
                        {anualizarTaxa(avgRate).toFixed(2)}% a.a.
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden xl:table-cell">
                      <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">
                        +R$ {formatBRL(merchants.reduce((s, m) => s + m.balance * (Math.pow(1 + m.cdiRate / 100, 12) - 1), 0))}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[12px] font-semibold text-slate-300 tabular-nums">
                        R$ {formatBRL(totalRendimento)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
