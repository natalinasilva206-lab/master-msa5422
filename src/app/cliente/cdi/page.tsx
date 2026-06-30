export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function anualizarTaxa(mensal: number) {
  return (Math.pow(1 + mensal / 100, 12) - 1) * 100
}

const meses = [
  { label: '1 mês',   n: 1  },
  { label: '3 meses', n: 3  },
  { label: '6 meses', n: 6  },
  { label: '12 meses', n: 12 },
  { label: '24 meses', n: 24 },
  { label: '36 meses', n: 36 },
]

export default async function ClienteCdiPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const saldo    = merchant?.balance   ?? 0
  const cdiRate  = merchant?.cdiRate   ?? 1.0
  const cdiAnual = anualizarTaxa(cdiRate)
  const plano    = merchant?.plan      ?? '—'

  const rendimentoMes = saldo * (cdiRate / 100)
  const rendimento12m  = saldo * (Math.pow(1 + cdiRate / 100, 12) - 1)

  return (
    <div>
      <Topbar
        title="CDI e Rendimentos"
        breadcrumb="Financeiro"
        subtitle={`Taxa atual: ${cdiRate.toFixed(2)}%/mês · ${cdiAnual.toFixed(2)}% a.a.`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Saldo em CDI', value: `R$ ${formatBRL(saldo)}`, sub: 'rendendo agora', color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/20', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'Taxa Mensal', value: `${cdiRate.toFixed(2)}%`, sub: `plano ${plano}`, color: 'text-amber-400', bg: 'bg-amber-500/10 text-amber-500', border: 'border-amber-500/20', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
            { label: 'Rendimento/Mês', value: `R$ ${formatBRL(rendimentoMes)}`, sub: 'projeção mensal', color: 'text-white', bg: 'bg-purple-500/10 text-purple-500', border: 'border-slate-800/70', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            { label: 'Rendimento/Ano', value: `R$ ${formatBRL(rendimento12m)}`, sub: 'em 12 meses compostos', color: 'text-blue-400', bg: 'bg-blue-500/10 text-blue-500', border: 'border-slate-800/70', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 hover:bg-slate-800/40 transition-colors`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[19px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
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

        {/* Simulação de projeção */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Projeção de Rendimento</p>
            <p className="text-[10.5px] text-slate-600 mt-0.5">Juros compostos sobre R$ {formatBRL(saldo)} à taxa de {cdiRate.toFixed(2)}%/mês</p>
          </div>
          {saldo === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <p className="text-[12.5px] font-medium">Sem saldo para projetar</p>
              <p className="text-[11px] text-slate-800 mt-1">Quando seu saldo for liberado, a projeção aparecerá aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Período</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Saldo Inicial</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Rendimento</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {meses.map(({ label, n }) => {
                    const rend = saldo * (Math.pow(1 + cdiRate / 100, n) - 1)
                    const total = saldo + rend
                    const pct = ((rend / saldo) * 100).toFixed(2)
                    return (
                      <tr key={label} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="text-[12.5px] font-semibold text-slate-300">{label}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[12px] text-slate-500 tabular-nums">R$ {formatBRL(saldo)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div>
                            <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">+R$ {formatBRL(rend)}</p>
                            <p className="text-[10px] text-slate-600">+{pct}%</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[14px] font-bold text-white tabular-nums">R$ {formatBRL(total)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Info */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-emerald-400">Como funciona o CDI Master Pagamentos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seu saldo disponível rende automaticamente à taxa de <strong className="text-slate-400">{cdiRate.toFixed(2)}% ao mês</strong> ({cdiAnual.toFixed(2)}% a.a.) pelo modelo de juros compostos. A taxa é definida de acordo com seu plano <strong className="text-slate-400">{plano}</strong> e pode ser ajustada pela administração. Nenhuma ação é necessária da sua parte — o rendimento é creditado mensalmente.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
