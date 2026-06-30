export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

const statusMeta: Record<string, { label: string; bg: string; dot: string }> = {
  APROVADO:    { label: 'Aprovado',    bg: 'text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-500' },
  PENDENTE:    { label: 'Pendente',    bg: 'text-amber-400 bg-amber-500/10',     dot: 'bg-amber-400' },
  CANCELADO:   { label: 'Cancelado',   bg: 'text-red-400 bg-red-500/10',         dot: 'bg-red-500' },
}

const typeMeta: Record<string, { label: string; color: string; icon: string }> = {
  VENDA:        { label: 'Venda',        color: 'text-emerald-400', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  ESTORNO:      { label: 'Estorno',      color: 'text-red-400',     icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
  MED_PIX:      { label: 'MED Pix',      color: 'text-orange-400',  icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  REEMBOLSO:    { label: 'Reembolso',    color: 'text-amber-400',   icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  PIX_DEVOLVIDO:{ label: 'Pix Devolvido',color: 'text-slate-400',   icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
}

export default async function AdminTransacoesPage() {
  const [saleLogs, merchantStats] = await Promise.all([
    prisma.saleLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { merchant: { select: { id: true, name: true, plan: true } } },
    }).catch(() => []),
    prisma.merchant.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { pendingBalance: true, balance: true },
      _count: { id: true },
    }).catch(() => null),
  ])

  const vendas       = saleLogs.filter((t) => t.type === 'VENDA' && t.status === 'APROVADO')
  const estornos     = saleLogs.filter((t) => t.type === 'ESTORNO' || t.type === 'MED_PIX')
  const volumeVendas = vendas.reduce((s, t) => s + t.amount, 0)
  const volumeEst    = estornos.reduce((s, t) => s + t.amount, 0)
  const ticketMed    = vendas.length > 0 ? volumeVendas / vendas.length : 0

  const totalBalance = (merchantStats?._sum?.pendingBalance ?? 0) + (merchantStats?._sum?.balance ?? 0)
  const sellersAtivos = merchantStats?._count?.id ?? 0

  return (
    <div>
      <Topbar
        title="Transações"
        breadcrumb="Casa › Financeiro"
        subtitle="Ledger de vendas, estornos e MEDs processados na plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Volume de Vendas',
              value: `R$ ${formatBRL(volumeVendas)}`,
              sub: `${vendas.length} vendas aprovadas`,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 text-emerald-500',
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            },
            {
              label: 'Ticket Médio',
              value: `R$ ${formatBRL(ticketMed)}`,
              sub: 'por venda aprovada',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 text-blue-500',
              icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
            },
            {
              label: 'Estornos / MEDs',
              value: `R$ ${formatBRL(volumeEst)}`,
              sub: `${estornos.length} ocorrências`,
              color: estornos.length > 0 ? 'text-red-400' : 'text-slate-500',
              bg: 'bg-red-500/10 text-red-500',
              icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
            },
            {
              label: 'Sellers Ativos',
              value: `${sellersAtivos}`,
              sub: `R$ ${formatBRL(totalBalance)} em carteira`,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 text-purple-500',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
            },
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

        {/* Tabela */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Ledger de Transações</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{saleLogs.length} registros · últimas 100 entradas</p>
            </div>
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/8 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              dados reais
            </span>
          </div>

          {saleLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma transação registrada ainda</p>
              <p className="text-[11px] text-slate-800 mt-1">Transações aparecem aqui conforme sellers processam vendas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Descrição</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Seller</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {saleLogs.map((tx) => {
                    const st  = statusMeta[tx.status] ?? statusMeta['PENDENTE']
                    const tp  = typeMeta[tx.type]     ?? typeMeta['VENDA']
                    const neg = tx.type !== 'VENDA'
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${st.bg}`}>{st.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <svg className={`w-3 h-3 shrink-0 ${tp.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={tp.icon} />
                            </svg>
                            <span className={`text-[11px] font-semibold ${tp.color}`}>{tp.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell max-w-[200px]">
                          <p className="text-[11.5px] text-slate-400 truncate">
                            {tx.description ?? tx.externalId ?? <span className="text-slate-700">—</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <a href={`/admin/clientes/${tx.merchant.id}`} className="text-[11.5px] text-slate-400 hover:text-white transition-colors truncate max-w-[130px] block">
                            {tx.merchant.name}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[13px] font-bold tabular-nums ${neg ? 'text-red-400' : 'text-emerald-400'}`}>
                            {neg ? '−' : '+'}R$ {formatBRL(tx.amount)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right hidden md:table-cell">
                          <span className="text-[11px] text-slate-600">{formatDate(tx.createdAt)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-2.5 border-t border-slate-800/50">
                <span className="text-[11px] text-slate-700">
                  Exibindo {saleLogs.length} de {saleLogs.length} transações · ledger real
                </span>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
