export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import { CdiRateInput } from './CdiRateInput'
import { BalanceInput } from './BalanceInput'
import { GlobalRateForm } from './GlobalRateForm'
import { CdiPrazoInput } from './CdiPrazoInput'
import { EarlyWithdrawRequests, type EarlyRequest } from './EarlyWithdrawRequests'
import { CreditCdiButton } from './CreditCdiButton'
import Link from 'next/link'

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

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

interface PageProps {
  searchParams: { q?: string }
}

const CDI_HISTORY_ACTIONS = [
  'ADD_TO_CDI', 'CDI_WITHDRAW', 'CDI_CREDIT',
  'CDI_EARLY_REQUEST', 'CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED',
  'CDI_RATE_UPDATED', 'CDI_LOCK_SET', 'CDI_LIMIT_SET',
]

const historyMeta: Record<string, { label: string; dot: string; sign: string; color: string }> = {
  ADD_TO_CDI:         { label: 'Aporte CDI',               dot: 'bg-emerald-500', sign: '+', color: 'text-emerald-400' },
  CDI_WITHDRAW:       { label: 'Resgate CDI',              dot: 'bg-orange-400',  sign: '-', color: 'text-orange-400' },
  CDI_CREDIT:         { label: 'Rendimento creditado',     dot: 'bg-emerald-600', sign: '+', color: 'text-emerald-300' },
  CDI_EARLY_REQUEST:  { label: 'Resgate antecip. solicit.', dot: 'bg-amber-400', sign: '',  color: 'text-amber-400' },
  CDI_EARLY_APPROVED: { label: 'Resgate antecip. aprovado', dot: 'bg-emerald-400',sign: '-', color: 'text-emerald-400' },
  CDI_EARLY_DENIED:   { label: 'Resgate antecip. negado',  dot: 'bg-red-400',    sign: '',  color: 'text-red-400' },
  CDI_RATE_UPDATED:   { label: 'Taxa CDI alterada',        dot: 'bg-purple-500',  sign: '',  color: 'text-purple-400' },
  CDI_LOCK_SET:       { label: 'Título criado',            dot: 'bg-blue-400',    sign: '',  color: 'text-blue-400' },
  CDI_LIMIT_SET:      { label: 'Prazo definido',           dot: 'bg-slate-400',   sign: '',  color: 'text-slate-400' },
}

export default async function CdiPage({ searchParams }: PageProps) {
  const q = searchParams.q?.trim().toLowerCase() ?? ''

  const [allMerchants, prazoLogs, earlyRequests, earlyResolved, cdiHistory, lastCredit] = await Promise.all([
    prisma.merchant.findMany({ orderBy: { balance: 'desc' } }),
    prisma.auditLog.findMany({
      where: { action: { in: ['CDI_LIMIT_SET', 'CDI_LOCK_SET'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { action: 'CDI_EARLY_REQUEST' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { merchant: { select: { name: true, balance: true } } } } },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: ['CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED'] } },
      select: { metadata: true },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: CDI_HISTORY_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { user: { select: { name: true, merchant: { select: { name: true } } } } },
    }),
    prisma.auditLog.findFirst({
      where: { action: 'CDI_CREDIT' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  // Filter merchants by search
  const merchants = q
    ? allMerchants.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.plan.toLowerCase().includes(q)
      )
    : allMerchants

  // Prazo map
  const prazoMap = new Map<string, string | null>()
  for (const log of prazoLogs) {
    if (log.entityId && !prazoMap.has(log.entityId)) {
      try {
        const m = JSON.parse(log.metadata ?? '{}')
        prazoMap.set(log.entityId, m.expiresAt ?? null)
      } catch {}
    }
  }

  // Resolved early withdraw IDs
  const resolvedIds = new Set<string>()
  for (const log of earlyResolved) {
    try {
      const m = JSON.parse(log.metadata ?? '{}')
      if (m.requestLogId) resolvedIds.add(m.requestLogId)
    } catch {}
  }

  const merchantMap = new Map(allMerchants.map((m) => [m.id, m]))

  const pendingRequests: EarlyRequest[] = earlyRequests
    .filter((r) => !resolvedIds.has(r.id))
    .map((r) => {
      const sellerName = r.user?.merchant?.name ?? '—'
      const cdiBalance = merchantMap.get(r.entityId ?? '')?.balance ?? 0
      let amount = 0
      try { amount = parseFloat(JSON.parse(r.metadata ?? '{}').amount || 0) } catch {}
      return { id: r.id, merchantId: r.entityId ?? '', sellerName, amount, createdAt: r.createdAt, cdiBalance }
    })

  const totalBalance    = allMerchants.reduce((s, m) => s + m.balance, 0)
  const totalRendimento = allMerchants.reduce((s, m) => s + m.balance * (m.cdiRate / 100), 0)
  const totalActive     = allMerchants.filter((m) => m.status === 'ACTIVE').length
  const activeWithCdi   = allMerchants.filter((m) => m.status === 'ACTIVE' && m.balance > 0).length
  const avgRate         = allMerchants.length > 0
    ? allMerchants.reduce((s, m) => s + m.cdiRate, 0) / allMerchants.length
    : 0
  const maxBalance = allMerchants.reduce((mx, m) => Math.max(mx, m.balance), 1)

  const merchantCounts: Record<string, number> = {}
  for (const m of allMerchants) {
    merchantCounts[m.plan] = (merchantCounts[m.plan] ?? 0) + 1
  }

  return (
    <div>
      <Topbar
        title="CDI e Rendimentos"
        breadcrumb="Casa › Financeiro"
        subtitle="Gerencie a taxa de rendimento CDI por conta de seller."
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Total de Sellers</p>
            <p className="text-[20px] font-bold text-white tabular-nums leading-none">{allMerchants.length}</p>
            <p className="text-[11px] text-slate-600 mt-2">{totalActive} ativos · {activeWithCdi} com CDI</p>
          </div>

          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo Total em Custódia</p>
            <p className="text-[20px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(totalBalance)}</p>
            <p className="text-[11px] text-slate-600 mt-2">Total em CDI rendendo</p>
          </div>

          <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Rendimento Est. / Mês</p>
            <p className="text-[20px] font-bold text-purple-400 tabular-nums leading-none">R$ {formatBRL(totalRendimento)}</p>
            <p className="text-[11px] text-slate-600 mt-2">
              R$ {formatBRL(totalRendimento * 12)} projetado / ano
            </p>
          </div>

          <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Taxa Média CDI</p>
            <p className="text-[20px] font-bold text-amber-400 tabular-nums leading-none">{avgRate.toFixed(2)}%/mês</p>
            <p className="text-[11px] text-slate-600 mt-2">{anualizarTaxa(avgRate).toFixed(2)}% a.a. equivalente</p>
          </div>
        </section>

        {/* Solicitações de resgate antecipado */}
        <EarlyWithdrawRequests requests={pendingRequests} />

        {/* Creditar CDI + Taxa Global */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ciclo CDI */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Ciclo de Rendimento CDI</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Credita o rendimento mensal para todos os sellers ativos
                </p>
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3.5 mb-4 space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Sellers que receberão</span>
                <span className="text-white font-semibold">{activeWithCdi}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Total a ser creditado agora</span>
                <span className="text-emerald-400 font-bold tabular-nums">R$ {formatBRL(totalRendimento)}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-slate-500">Último ciclo</span>
                <span className="text-slate-400 font-medium">
                  {lastCredit ? formatDate(lastCredit.createdAt) : 'Nunca executado'}
                </span>
              </div>
            </div>
            <CreditCdiButton
              lastCreditAt={lastCredit?.createdAt.toISOString() ?? null}
              activeCount={activeWithCdi}
            />
          </div>

          {/* Taxa Global */}
          <GlobalRateForm merchantCounts={merchantCounts} />
        </div>

        {/* Sellers table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[13px] font-semibold text-white">Sellers cadastrados</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {q ? `${merchants.length} resultado${merchants.length !== 1 ? 's' : ''} para "${q}"` : 'Clique no saldo ou na taxa para editar'}
              </p>
            </div>
            <form method="GET" action="/admin/cdi" className="flex items-center gap-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar seller..."
                  className="pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[12px] text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 w-44"
                />
              </div>
              {q && (
                <Link href="/admin/cdi" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                  Limpar
                </Link>
              )}
            </form>
          </div>

          {merchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-600">
              <p className="text-[13px]">Nenhum seller encontrado</p>
              {q && <Link href="/admin/cdi" className="mt-2 text-[12px] text-blue-500 hover:text-blue-400">Limpar busca</Link>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Saldo CDI <span className="ml-1 text-slate-700 normal-case tracking-normal font-normal">(editável)</span>
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Taxa/mês</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Prazo</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Equiv. a.a.</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rend. / mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {merchants.map((m, i) => {
                    const rendimento = m.balance * (m.cdiRate / 100)
                    const anual = anualizarTaxa(m.cdiRate)
                    const balancePct = totalBalance > 0 ? (m.balance / maxBalance) * 100 : 0
                    const prazo = prazoMap.get(m.id) ?? null
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/20 transition-colors duration-100">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                              {getInitials(m.name)}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/admin/clientes/${m.id}`} className="text-[13px] font-medium text-white truncate hover:text-blue-400 transition-colors">{m.name}</Link>
                              <p className="text-[11px] text-slate-500">{m.email}</p>
                              {m.balance > 0 && (
                                <div className="mt-1.5 w-28 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full" style={{ width: `${balancePct}%` }} />
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusVariant[m.status] ?? 'neutral'}>{statusLabel[m.status] ?? m.status}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[12px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md">{m.plan}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <BalanceInput merchantId={m.id} initialBalance={m.balance} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <CdiRateInput merchantId={m.id} initialRate={m.cdiRate} />
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <CdiPrazoInput merchantId={m.id} expiresAt={prazo} />
                        </td>
                        <td className="px-4 py-4 text-center hidden xl:table-cell">
                          <span className="text-[12px] font-semibold text-slate-400 tabular-nums">{anual.toFixed(2)}% a.a.</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <p className="text-[13px] font-semibold text-slate-300 tabular-nums">R$ {formatBRL(rendimento)}</p>
                          {m.balance > 0 && (
                            <p className="text-[10.5px] text-slate-600 mt-0.5">{m.cdiRate.toFixed(2)}% × R$ {formatBRL(m.balance)}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700/60 bg-slate-900/30">
                    <td colSpan={3} className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-[11px] text-slate-600">
                        {merchants.length} seller{merchants.length !== 1 ? 's' : ''}
                        {q ? ` (filtrado de ${allMerchants.length})` : ' cadastrados'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">R$ {formatBRL(totalBalance)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[11.5px] font-semibold text-amber-400">{avgRate.toFixed(2)}% avg</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell" />
                    <td className="px-4 py-3.5 text-center hidden xl:table-cell">
                      <span className="text-[11.5px] font-semibold text-slate-500">{anualizarTaxa(avgRate).toFixed(2)}% a.a.</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[12px] font-semibold text-slate-300 tabular-nums">R$ {formatBRL(totalRendimento)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Histórico de operações CDI */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Histórico de Operações CDI</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Últimas 60 movimentações CDI de todos os sellers</p>
          </div>

          {cdiHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <p className="text-[13px] font-medium">Nenhuma operação CDI ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {['Operação', 'Seller', 'Valor', 'Taxa', 'Data'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {cdiHistory.map((log) => {
                    const meta = historyMeta[log.action] ?? { label: log.action, dot: 'bg-slate-600', sign: '', color: 'text-slate-400' }
                    let amount = 0
                    let rate: number | null = null
                    try {
                      const m = JSON.parse(log.metadata ?? '{}')
                      amount = parseFloat(m.amount || m.rate || 0)
                      if (m.rate && log.action === 'CDI_RATE_UPDATED') rate = parseFloat(m.rate)
                      if (m.amount) amount = parseFloat(m.amount)
                    } catch {}

                    const sellerName = log.user?.merchant?.name ?? (log.entityId ?? '').slice(0, 8) + '…'

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                            <span className="text-[12px] text-slate-300 font-medium">{meta.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 truncate max-w-[140px]">{sellerName}</td>
                        <td className="px-4 py-3 font-mono">
                          {amount > 0 ? (
                            <span className={`font-semibold tabular-nums ${meta.color}`}>
                              {meta.sign}{meta.sign ? ' ' : ''}R$ {formatBRL(amount)}
                            </span>
                          ) : rate !== null ? (
                            <span className="text-purple-400 font-semibold">{rate.toFixed(2)}%/mês</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {(() => {
                            try {
                              const m = JSON.parse(log.metadata ?? '{}')
                              return m.rate && log.action !== 'CDI_RATE_UPDATED' ? `${parseFloat(m.rate).toFixed(2)}%` : '—'
                            } catch { return '—' }
                          })()}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-[11px]">{formatDate(log.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
