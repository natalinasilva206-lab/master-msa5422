export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

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

const taxaAntecipacao = 2.5

export default async function AntecipacoesPage() {
  const merchants = await prisma.merchant.findMany({
    where: { status: 'ACTIVE', pendingBalance: { gt: 0 } },
    orderBy: { pendingBalance: 'desc' },
  })

  const totalPendente = merchants.reduce((s, m) => s + m.pendingBalance, 0)
  const totalAntecipavel = totalPendente * (1 - taxaAntecipacao / 100)

  return (
    <div>
      <Topbar
        title="Antecipações"
        breadcrumb="Casa › Financeiro"
        subtitle={`Taxa de antecipação: ${taxaAntecipacao}% sobre o valor pendente.`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'A Receber (Total)', value: `R$ ${formatBRL(totalPendente)}`, sub: 'saldo pendente em custódia', color: 'text-amber-400', bg: 'bg-amber-500/10 text-amber-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Antecipável Líquido', value: `R$ ${formatBRL(totalAntecipavel)}`, sub: `após taxa de ${taxaAntecipacao}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-500', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            { label: 'Antecipações Abertas', value: '0', sub: 'em processamento', color: 'text-slate-500', bg: 'bg-blue-500/10 text-blue-500', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
            { label: 'Taxa de Antecipação', value: `${taxaAntecipacao}%`, sub: 'sobre o valor bruto', color: 'text-purple-400', bg: 'bg-purple-500/10 text-purple-500', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[17px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-600 mt-1.5">{c.sub}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${c.bg}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Sellers com saldo pendente */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Sellers com Saldo Pendente</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Elegíveis para antecipação de recebíveis</p>
            </div>
            {merchants.length > 0 && (
              <span className="text-[10.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                {merchants.length} elegível{merchants.length !== 1 ? 'is' : ''}
              </span>
            )}
          </div>

          {merchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum saldo pendente</p>
              <p className="text-[11px] text-slate-800 mt-1">Sellers sem saldo a receber no momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Seller</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Saldo Pendente</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Taxa ({taxaAntecipacao}%)</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {merchants.map((m, i) => {
                    const taxa = m.pendingBalance * (taxaAntecipacao / 100)
                    const liquido = m.pendingBalance - taxa
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                              {getInitials(m.name)}
                            </div>
                            <div>
                              <p className="text-[12.5px] font-semibold text-white">{m.name}</p>
                              <p className="text-[10.5px] text-slate-600">{m.plan}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[13px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(m.pendingBalance)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right hidden md:table-cell">
                          <span className="text-[12px] text-red-400 tabular-nums">−R$ {formatBRL(taxa)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[13px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(liquido)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700/60 bg-slate-900/30">
                    <td className="px-5 py-3 text-[11px] text-slate-600">{merchants.length} seller{merchants.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[12px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(totalPendente)}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-[12px] text-red-400 tabular-nums">−R$ {formatBRL(totalPendente * taxaAntecipacao / 100)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">R$ {formatBRL(totalAntecipavel)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Como funciona a antecipação</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              O seller solicita antecipação do saldo pendente. Uma taxa de {taxaAntecipacao}% é descontada e o valor líquido é liberado imediatamente no saldo disponível. O saldo pendente é gerenciado pela Master Pagamentos.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
