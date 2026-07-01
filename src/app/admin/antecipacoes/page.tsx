export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { AntecipacaoRow } from './AntecipacaoRow'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface PageProps {
  searchParams: { tab?: string; q?: string }
}

export default async function AntecipacoesPage({ searchParams }: PageProps) {
  const tab = searchParams.tab ?? 'pendentes'
  const q   = searchParams.q?.trim() ?? ''

  const [pendentes, historico, kpis, merchantsComRecebiveis] = await Promise.all([
    // Pending requests
    prisma.anticipation.findMany({
      where: {
        status: 'PENDENTE',
        ...(q ? { merchant: { name: { contains: q, mode: 'insensitive' } } } : {}),
      },
      include: { merchant: { select: { name: true, plan: true } } },
      orderBy: { createdAt: 'asc' },
    }),

    // History (approved + rejected + cancelled)
    prisma.anticipation.findMany({
      where: {
        status: tab === 'aprovadas' ? 'APROVADA' : tab === 'rejeitadas' ? 'REJEITADA' : { in: ['APROVADA', 'REJEITADA', 'CANCELADA'] },
        ...(q ? { merchant: { name: { contains: q, mode: 'insensitive' } } } : {}),
      },
      include: { merchant: { select: { name: true, plan: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),

    // KPI aggregations
    prisma.anticipation.groupBy({
      by: ['status'],
      _sum: { requestedAmount: true, netAmount: true, feeAmount: true },
      _count: { id: true },
    }),

    // Merchants with card receivables (futureBalance > 0)
    prisma.merchant.findMany({
      where: { status: 'ACTIVE', futureBalance: { gt: 0 } },
      select: { id: true, name: true, plan: true, futureBalance: true, anticipationFeePercent: true },
      orderBy: { futureBalance: 'desc' },
    }),
  ])

  const kpiAprovadas    = kpis.find((k) => k.status === 'APROVADA')
  const kpiPendentes    = kpis.find((k) => k.status === 'PENDENTE')
  const totalAprovado   = kpiAprovadas?._sum?.requestedAmount ?? 0
  const totalLiquido    = kpiAprovadas?._sum?.netAmount ?? 0
  const totalTaxas      = kpiAprovadas?._sum?.feeAmount ?? 0
  const countAprovadas  = kpiAprovadas?._count?.id ?? 0
  const countPendentes  = kpiPendentes?._count?.id ?? 0

  const totalRecebiveis = merchantsComRecebiveis.reduce((s, m) => s + m.futureBalance, 0)

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
              sub: `${merchantsComRecebiveis.length} seller${merchantsComRecebiveis.length !== 1 ? 's' : ''} com cartão a liquidar`,
              color: 'text-amber-400',
            },
            {
              label: 'Solicitações Pendentes',
              value: String(pendentes.length),
              sub: pendentes.length > 0 ? `R$ ${formatBRL(pendentes.reduce((s, a) => s + a.requestedAmount, 0))} solicitados` : 'Nenhuma pendente',
              color: pendentes.length > 0 ? 'text-orange-400' : 'text-slate-500',
            },
            {
              label: 'Total Antecipado',
              value: `R$ ${formatBRL(totalAprovado)}`,
              sub: `${countAprovadas} antecipações aprovadas`,
              color: 'text-emerald-400',
            },
            {
              label: 'Receita de Taxas',
              value: `R$ ${formatBRL(totalTaxas)}`,
              sub: `Líquido pago: R$ ${formatBRL(totalLiquido)}`,
              color: 'text-blue-400',
            },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[17px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-slate-600 mt-1.5">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Search */}
        <div className="flex items-center gap-3">
          <form method="get" className="flex-1 max-w-xs">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar seller..."
              className="w-full px-3.5 py-2 bg-slate-900/60 border border-slate-800/70 text-slate-200 text-[12.5px] rounded-xl focus:outline-none focus:border-blue-500/40 placeholder-slate-600"
            />
          </form>
          {q && (
            <Link href="/admin/antecipacoes" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
              Limpar
            </Link>
          )}
        </div>

        {/* Pending requests */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Solicitações Pendentes</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Aguardando aprovação ou rejeição do administrador</p>
            </div>
            {pendentes.length > 0 && (
              <span className="text-[10.5px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma solicitação pendente</p>
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

        {/* Sellers with receivables */}
        {merchantsComRecebiveis.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Sellers com Recebíveis de Cartão</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">Merchants ativos com saldo futuro de cartão (futureBalance) elegível para antecipação</p>
              </div>
              <span className="text-[10.5px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                {merchantsComRecebiveis.length} seller{merchantsComRecebiveis.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recebíveis</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Taxa</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Líquido Estimado</th>
                    <th className="text-right px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {merchantsComRecebiveis.map((m) => {
                    const fee     = m.anticipationFeePercent
                    const feeAmt  = Math.round(m.futureBalance * (fee / 100) * 100) / 100
                    const liquido = Math.round((m.futureBalance - feeAmt) * 100) / 100
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-white">{m.name}</p>
                          <p className="text-[10.5px] text-slate-500">{m.plan}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[13px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(m.futureBalance)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right hidden md:table-cell">
                          <span className="text-[12px] text-slate-400 tabular-nums">{fee}%</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[13px] font-semibold text-emerald-400 tabular-nums">R$ {formatBRL(liquido)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/admin/clientes/${m.id}`}
                            className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Ver merchant →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700/60 bg-slate-900/30">
                    <td className="px-5 py-2.5 text-[11px] text-slate-600">{merchantsComRecebiveis.length} seller{merchantsComRecebiveis.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-[12px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(totalRecebiveis)}</span>
                    </td>
                    <td className="hidden md:table-cell" />
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">
                        R$ {formatBRL(merchantsComRecebiveis.reduce((s, m) => {
                          const fee = m.anticipationFeePercent
                          return s + Math.round((m.futureBalance * (1 - fee / 100)) * 100) / 100
                        }, 0))}
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* History with tab filter */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[13px] font-semibold text-white">Histórico</p>
            <div className="flex items-center gap-1">
              {[
                { key: 'historico', label: 'Todas' },
                { key: 'aprovadas', label: 'Aprovadas' },
                { key: 'rejeitadas', label: 'Rejeitadas' },
              ].map((t) => (
                <Link
                  key={t.key}
                  href={`/admin/antecipacoes?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                    tab === t.key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          {historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <p className="text-[12.5px] font-medium">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {historico.map((a) => {
                const statusColor: Record<string, string> = {
                  APROVADA:  'text-emerald-400 bg-emerald-500/10',
                  REJEITADA: 'text-red-400 bg-red-500/10',
                  CANCELADA: 'text-slate-500 bg-slate-700/30',
                }
                return (
                  <div key={a.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-slate-200 truncate">{a.merchant.name}</p>
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${statusColor[a.status] ?? 'text-slate-400 bg-slate-700/30'}`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-600 mt-0.5">
                        {a.merchant.plan} · Taxa {a.feePercent}% · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(a.updatedAt))}
                      </p>
                      {a.adminNotes && <p className="text-[10px] text-slate-600 mt-0.5 italic">Obs: {a.adminNotes}</p>}
                    </div>
                    {a.status === 'APROVADA' ? (
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-emerald-400 tabular-nums">+R$ {formatBRL(a.netAmount)}</p>
                        <p className="text-[10px] text-slate-600 tabular-nums">bruto R$ {formatBRL(a.requestedAmount)}</p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-500 tabular-nums shrink-0">R$ {formatBRL(a.requestedAmount)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Exclusivo para recebíveis de cartão de crédito</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              A antecipação incide sobre o futureBalance (cartão) — não tem relação com CDI, Pix ou boleto.
              Ao aprovar, você pode ajustar a taxa antes de confirmar. O valor bruto sai do saldo futuro e o líquido entra no saldo disponível.
              A taxa padrão por plano é configurável individualmente em cada merchant.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
