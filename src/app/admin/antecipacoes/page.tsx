export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { AntecipacaoRow } from './AntecipacaoRow'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
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

const taxaPlano: Record<string, number> = { Start: 2.5, Growth: 2.0, Prime: 1.5, Black: 1.0 }
const TAXA_DEFAULT = 2.5

export default async function AntecipacoesPage() {
  const [merchants, antecipacaoLogs] = await Promise.all([
    prisma.merchant.findMany({
      where: { status: 'ACTIVE', pendingBalance: { gte: 10 } },
      orderBy: { pendingBalance: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { action: 'ANTECIPACAO_REQUEST' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { user: { select: { name: true, email: true, merchant: { select: { name: true } } } } },
    }),
  ])

  const totalPendente    = merchants.reduce((s, m) => s + m.pendingBalance, 0)
  const totalTaxas       = merchants.reduce((s, m) => {
    const pct = taxaPlano[m.plan] ?? TAXA_DEFAULT
    return s + Math.round(m.pendingBalance * (pct / 100) * 100) / 100
  }, 0)
  const totalAntecipavel = totalPendente - totalTaxas

  const totalAntecipado = antecipacaoLogs.reduce((s, l) => {
    try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
  }, 0)

  return (
    <div>
      <Topbar
        title="Antecipações"
        breadcrumb="Casa › Financeiro"
        subtitle="Taxa por plano: Start 2.5% · Growth 2.0% · Prime 1.5% · Black 1.0%"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'A Receber (Total)',
              value: `R$ ${formatBRL(totalPendente)}`,
              sub: 'saldo pendente em custódia',
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 text-amber-500',
              icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              label: 'Antecipável Líquido',
              value: `R$ ${formatBRL(totalAntecipavel)}`,
              sub: 'após taxas por plano',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 text-emerald-500',
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            },
            {
              label: 'Total Antecipado',
              value: `R$ ${formatBRL(totalAntecipado)}`,
              sub: `${antecipacaoLogs.length} antecipações realizadas`,
              color: antecipacaoLogs.length > 0 ? 'text-blue-400' : 'text-slate-500',
              bg: 'bg-blue-500/10 text-blue-500',
              icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
            },
            {
              label: 'Taxa de Antecipação',
              value: `1–2.5%`,
              sub: 'varia por plano do seller',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 text-purple-500',
              icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Sellers elegíveis */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Antecipação Admin-Iniciada</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">Sellers com saldo pendente ≥ R$10 disponíveis para antecipar</p>
              </div>
              {merchants.length > 0 && (
                <span className="text-[10.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  {merchants.length} disponível{merchants.length !== 1 ? 'is' : ''}
                </span>
              )}
            </div>

            {merchants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[13px] font-medium">Nenhum seller elegível</p>
                <p className="text-[11px] text-slate-800 mt-1">Nenhum seller ativo com saldo pendente ≥ R$10.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pendente</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Taxa</th>
                      <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Líquido</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {merchants.map((m, i) => {
                      const taxaPercent = taxaPlano[m.plan] ?? TAXA_DEFAULT
                      const taxa    = Math.round(m.pendingBalance * (taxaPercent / 100) * 100) / 100
                      const liquido = Math.round((m.pendingBalance - taxa) * 100) / 100
                      return (
                        <AntecipacaoRow
                          key={m.id}
                          merchantId={m.id}
                          name={m.name}
                          plan={m.plan}
                          taxaPercent={taxaPercent}
                          initial={getInitials(m.name)}
                          gradient={avatarGradients[i % avatarGradients.length]}
                          pendingBalance={m.pendingBalance}
                          taxa={taxa}
                          liquido={liquido}
                        />
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-700/60 bg-slate-900/30">
                      <td className="px-5 py-3 text-[12px] text-slate-600">{merchants.length} seller{merchants.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-[13px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(totalPendente)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell">
                        <span className="text-[13px] text-red-400 tabular-nums">−R$ {formatBRL(totalTaxas)}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className="text-[13px] font-semibold text-emerald-400 tabular-nums">R$ {formatBRL(totalAntecipavel)}</span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {/* Histórico de antecipações */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico de Antecipações</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{antecipacaoLogs.length} operações realizadas</p>
            </div>

            {antecipacaoLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhuma antecipação ainda</p>
                <p className="text-[11px] text-slate-800 mt-1">O histórico aparecerá aqui conforme os sellers anteciparem.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[400px] overflow-y-auto">
                {antecipacaoLogs.map((log, i) => {
                  let amount = 0, liquido = 0, taxa = 0
                  try {
                    const m = JSON.parse(log.metadata ?? '{}')
                    amount  = parseFloat(m.amount  || 0)
                    liquido = parseFloat(m.liquido || 0)
                    taxa    = parseFloat(m.taxa    || 0)
                  } catch {}
                  return (
                    <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      <div className={`shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[10px] font-bold text-white`}>
                        {getInitials(log.user.merchant?.name ?? log.user.name ?? '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-200 truncate">
                          {log.user.merchant?.name ?? log.user.name ?? log.user.email}
                        </p>
                        <p className="text-[12px] text-slate-600">{formatDate(log.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-emerald-400 tabular-nums">+R$ {formatBRL(liquido || amount)}</p>
                        {taxa > 0 && (
                          <p className="text-[10px] text-slate-600 tabular-nums">bruto R$ {formatBRL(amount)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Como funciona a antecipação</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              O seller solicita antecipação do saldo pendente. A taxa varia por plano: Start 2.5%, Growth 2.0%, Prime 1.5%, Black 1.0%. O valor líquido é liberado imediatamente no saldo disponível em CDI.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
