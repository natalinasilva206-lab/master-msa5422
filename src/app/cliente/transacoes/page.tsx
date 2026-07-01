export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

function getAmount(metadata: string | null): number {
  try {
    const m = JSON.parse(metadata ?? '{}')
    return parseFloat(m.amount || m.value || 0)
  } catch { return 0 }
}

function getDescription(metadata: string | null): string {
  try {
    const m = JSON.parse(metadata ?? '{}')
    return m.description || m.reason || m.obs || ''
  } catch { return '' }
}

export default async function ClienteTransacoesPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const plano    = merchant?.plan ?? '—'

  // Vendas = BALANCE_ADJUST events que creditam o pendingBalance (recebimentos de vendas)
  const vendas = merchant
    ? await prisma.auditLog.findMany({
        where: { entityId: merchant.id, entity: 'Merchant', action: 'BALANCE_ADJUST' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    : []

  const totalRecebido = vendas.reduce((s, l) => s + getAmount(l.metadata), 0)
  const ticketMedio   = vendas.length > 0 ? totalRecebido / vendas.length : 0
  const ultimaVenda   = vendas[0]

  return (
    <div>
      <Topbar
        title="Transações"
        breadcrumb="Financeiro"
        subtitle="Vendas recebidas pelo seu gateway de pagamento"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Recebido', value: `R$ ${formatBRL(totalRecebido)}`,  color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Nº de Vendas',   value: String(vendas.length),             color: 'text-blue-400',    border: 'border-slate-800/70' },
            { label: 'Ticket Médio',   value: `R$ ${formatBRL(ticketMedio)}`,    color: 'text-purple-400',  border: 'border-slate-800/70' },
            {
              label: 'Última Venda',
              value: ultimaVenda ? formatDate(ultimaVenda.createdAt) : '—',
              color: 'text-slate-300',
              border: 'border-slate-800/70',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums leading-tight ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Tabela de vendas */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Histórico de Vendas</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{vendas.length} transaçõe{vendas.length !== 1 ? 's' : ''} · Plano {plano}</p>
            </div>
            {totalRecebido > 0 && (
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                +R$ {formatBRL(totalRecebido)}
              </span>
            )}
          </div>

          {vendas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-700 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-slate-500">Nenhuma venda registrada ainda</p>
              <p className="text-[11.5px] text-slate-700 mt-1.5 max-w-xs">
                As transações dos seus clientes aparecerão aqui automaticamente após a integração com o gateway de pagamento.
              </p>
              <div className="mt-5 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3 max-w-sm">
                <p className="text-[11px] text-blue-400 font-semibold mb-1">Como integrar?</p>
                <p className="text-[10.5px] text-slate-600">
                  Acesse <Link href="/cliente/integracoes" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Integrações / API</Link> para obter sua chave de API e webhooks de notificação de pagamento.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Transação</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Descrição</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {vendas.map((log, i) => {
                    const amount = getAmount(log.metadata)
                    const desc   = getDescription(log.metadata)
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              +
                            </div>
                            <div>
                              <p className="text-[13px] text-slate-200 font-medium">Venda #{String(vendas.length - i).padStart(4, '0')}</p>
                              <p className="text-[12px] text-slate-600">Aprovado · Gateway</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className="text-[12px] text-slate-500 truncate max-w-[180px] block">
                            {desc || 'Venda processada'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-[13px] font-bold tabular-nums text-emerald-400">
                            +R$ {formatBRL(amount)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          <span className="text-[12px] text-slate-600">{formatDate(log.createdAt)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {vendas.length > 0 && (
          <p className="text-center text-[10.5px] text-slate-700">
            Exibindo as últimas {vendas.length} vendas · Valores creditados no saldo disponível após compensação
          </p>
        )}

      </div>
    </div>
  )
}
