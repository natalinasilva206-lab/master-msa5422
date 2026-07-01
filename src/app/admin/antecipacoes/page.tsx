export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { AntecipacaoRow } from './AntecipacaoRow'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function AntecipacoesPage() {
  const [pendentes, recentes, kpis] = await Promise.all([
    prisma.anticipation.findMany({
      where: { status: 'PENDENTE' },
      include: { merchant: { select: { name: true, plan: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.anticipation.findMany({
      where: { status: { in: ['APROVADA', 'REJEITADA'] } },
      include: { merchant: { select: { name: true, plan: true } } },
      orderBy: { resolvedAt: 'desc' },
      take: 30,
    }),
    prisma.anticipation.groupBy({
      by: ['status'],
      _sum: { requestedAmount: true, netAmount: true, feeAmount: true },
      _count: { id: true },
    }),
  ])

  const kpiAprovadas = kpis.find((k) => k.status === 'APROVADA')
  const totalAprovado  = kpiAprovadas?._sum?.requestedAmount ?? 0
  const totalLiquido   = kpiAprovadas?._sum?.netAmount ?? 0
  const totalTaxas     = kpiAprovadas?._sum?.feeAmount ?? 0
  const countAprovadas = kpiAprovadas?._count?.id ?? 0

  // Total futureBalance of all active merchants = total card receivables in custody
  const recebiveisTotais = await prisma.merchant.aggregate({
    where: { status: 'ACTIVE' },
    _sum: { futureBalance: true },
  })
  const totalRecebiveis = recebiveisTotais._sum.futureBalance ?? 0

  return (
    <div>
      <Topbar
        title="Antecipações de Cartão"
        subtitle="Solicitações de antecipação de recebíveis de cartão de crédito"
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Recebíveis em Custódia',
              value: `R$ ${formatBRL(totalRecebiveis)}`,
              sub: 'futureBalance de sellers ativos',
              color: 'text-amber-400',
              icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              label: 'Solicitações Pendentes',
              value: String(pendentes.length),
              sub: pendentes.length > 0 ? `R$ ${formatBRL(pendentes.reduce((s, a) => s + a.requestedAmount, 0))} solicitados` : 'Nenhuma pendente',
              color: pendentes.length > 0 ? 'text-orange-400' : 'text-slate-500',
              icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            },
            {
              label: 'Total Antecipado',
              value: `R$ ${formatBRL(totalAprovado)}`,
              sub: `${countAprovadas} antecipações aprovadas`,
              color: 'text-emerald-400',
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            },
            {
              label: 'Receita de Taxas',
              value: `R$ ${formatBRL(totalTaxas)}`,
              sub: `Líquido pago aos sellers: R$ ${formatBRL(totalLiquido)}`,
              color: 'text-blue-400',
              icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
            },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[17px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-slate-600 mt-1.5">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Pending requests */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Solicitações Pendentes</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Sellers solicitaram antecipação dos recebíveis de cartão</p>
            </div>
            {pendentes.length > 0 && (
              <span className="text-[10.5px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma solicitação pendente</p>
              <p className="text-[11px] text-slate-800 mt-1">Quando um seller solicitar antecipação, aparecerá aqui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Solicitado</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Taxa</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Líquido</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {pendentes.map((a) => (
                    <AntecipacaoRow
                      key={a.id}
                      id={a.id}
                      merchantName={a.merchant.name}
                      plan={a.merchant.plan}
                      requestedAmount={a.requestedAmount}
                      feePercent={a.feePercent}
                      feeAmount={a.feeAmount}
                      netAmount={a.netAmount}
                      notes={a.notes}
                      createdAt={a.createdAt.toISOString()}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent history */}
        {recentes.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico Recente</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Últimas {recentes.length} antecipações processadas</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {recentes.map((a) => (
                <div key={a.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-slate-200 truncate">{a.merchant.name}</p>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${a.status === 'APROVADA' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 mt-0.5">
                      {a.merchant.plan} · Taxa {a.feePercent}% · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(a.resolvedAt ?? a.createdAt))}
                    </p>
                    {a.adminNotes && <p className="text-[10px] text-slate-600 mt-0.5 italic">Obs: {a.adminNotes}</p>}
                  </div>
                  {a.status === 'APROVADA' && (
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-emerald-400 tabular-nums">+R$ {formatBRL(a.netAmount)}</p>
                      <p className="text-[10px] text-slate-600 tabular-nums">bruto R$ {formatBRL(a.requestedAmount)}</p>
                    </div>
                  )}
                  {a.status === 'REJEITADA' && (
                    <p className="text-[12px] text-red-400 tabular-nums shrink-0">R$ {formatBRL(a.requestedAmount)}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info box */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Exclusivo para recebíveis de cartão de crédito</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              A antecipação incide sobre o saldo futuro de cartão (futureBalance) — não tem relação com CDI, Pix, boleto ou outros meios.
              Ao aprovar, o valor bruto sai do saldo futuro e o valor líquido (após taxa) entra no saldo disponível para saque imediato.
              A taxa é definida por plano do seller e configurável por merchant.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
