export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

const actionMeta: Record<string, { label: string; dot: string; group: string }> = {
  ADD_TO_CDI:             { label: 'Aporte CDI',               dot: 'bg-emerald-500',  group: 'CDI' },
  CDI_WITHDRAW:           { label: 'Resgate CDI',              dot: 'bg-orange-500',   group: 'CDI' },
  CDI_EARLY_REQUEST:      { label: 'Resgate CDI Antecipado',   dot: 'bg-orange-400',   group: 'CDI' },
  CDI_EARLY_APPROVED:     { label: 'Resgate CDI Aprovado',     dot: 'bg-emerald-400',  group: 'CDI' },
  CDI_EARLY_DENIED:       { label: 'Resgate CDI Negado',       dot: 'bg-red-400',      group: 'CDI' },
  CDI_RATE_UPDATED:       { label: 'Taxa CDI Atualizada',      dot: 'bg-purple-500',   group: 'CDI' },
  ANTECIPACAO_REQUEST:    { label: 'Antecipação Solicitada',   dot: 'bg-blue-400',     group: 'Antecipação' },
  ANTECIPACAO_APPROVED:   { label: 'Antecipação Aprovada',     dot: 'bg-blue-500',     group: 'Antecipação' },
  ANTECIPACAO_REJECTED:   { label: 'Antecipação Rejeitada',    dot: 'bg-red-400',      group: 'Antecipação' },
  WITHDRAW_REQUEST:       { label: 'Saque Solicitado',         dot: 'bg-amber-500',    group: 'Saque' },
  WITHDRAW_APPROVED:      { label: 'Saque Aprovado',           dot: 'bg-emerald-400',  group: 'Saque' },
  WITHDRAW_DENIED:        { label: 'Saque Negado',             dot: 'bg-red-400',      group: 'Saque' },
  KYC_APPROVED:           { label: 'KYC Aprovado',             dot: 'bg-emerald-500',  group: 'KYC' },
  KYC_BLOCKED:            { label: 'KYC Bloqueado',            dot: 'bg-red-500',      group: 'KYC' },
  BALANCE_ADJUST:         { label: 'Ajuste de Saldo (Venda)', dot: 'bg-emerald-600',  group: 'Vendas' },
  RISK_AUTO_RESERVE:      { label: 'Reserva Automática',       dot: 'bg-violet-500',   group: 'Risco' },
  RISK_MANUAL_RESERVE:    { label: 'Reserva Manual',           dot: 'bg-violet-400',   group: 'Risco' },
  RISK_MANUAL_RELEASE:    { label: 'Liberação Manual',         dot: 'bg-teal-500',     group: 'Risco' },
  RISK_RESERVE_APPLIED:   { label: 'Reserva Aplicada',         dot: 'bg-violet-600',   group: 'Risco' },
  RISK_CONFIG_UPDATED:    { label: 'Config. Risco Atualizada', dot: 'bg-purple-400',   group: 'Risco' },
  DISPUTE_OPENED:         { label: 'Disputa Aberta',           dot: 'bg-orange-500',   group: 'Disputas' },
  DISPUTE_RESOLVED:       { label: 'Disputa Resolvida',        dot: 'bg-teal-400',     group: 'Disputas' },
  DISPUTE_STATUS_CHANGED: { label: 'Status Disputa Alterado',  dot: 'bg-amber-400',    group: 'Disputas' },
  CREATE_MERCHANT:        { label: 'Empresa Criada',           dot: 'bg-slate-400',    group: 'Admin' },
  UPDATE_MERCHANT:        { label: 'Empresa Atualizada',       dot: 'bg-slate-400',    group: 'Admin' },
  BLOCK_MERCHANT:         { label: 'Empresa Bloqueada',        dot: 'bg-red-400',      group: 'Admin' },
  ACTIVATE_MERCHANT:      { label: 'Empresa Ativada',          dot: 'bg-emerald-400',  group: 'Admin' },
  RESET_MERCHANT_PASSWORD:{ label: 'Senha Redefinida',         dot: 'bg-slate-500',    group: 'Admin' },
  CREATE_CLIENT_ACCESS:   { label: 'Acesso Cliente Criado',    dot: 'bg-slate-400',    group: 'Admin' },
  MERCHANT_STATUS_CHANGE: { label: 'Status Alterado',          dot: 'bg-amber-400',    group: 'Admin' },
}

const ACTION_GROUPS = ['CDI', 'Antecipação', 'Saque', 'KYC', 'Vendas', 'Risco', 'Disputas', 'Admin']

interface PageProps {
  searchParams: {
    from?: string
    to?: string
    action?: string
    page?: string
  }
}

export default async function ConciliacaoPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const from = searchParams.from ?? ''
  const to = searchParams.to ?? ''
  const actionFilter = searchParams.action ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const pageSize = 50

  const where: Record<string, unknown> = {}
  if (actionFilter) where.action = actionFilter
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    }
  }

  const [logs, total, kpiRaw] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true, merchant: { select: { name: true } } } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      select: { action: true, metadata: true },
      take: 5000,
    }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  const addToCdiLogs    = kpiRaw.filter((l) => l.action === 'ADD_TO_CDI')
  const antLogs         = kpiRaw.filter((l) => l.action === 'ANTECIPACAO_APPROVED')
  const withdrawLogs    = kpiRaw.filter((l) => l.action === 'WITHDRAW_REQUEST')

  function sumAmount(arr: { metadata: string | null }[]) {
    return arr.reduce((s, l) => {
      try { const m = JSON.parse(l.metadata ?? '{}'); return s + (parseFloat(m.amount) || 0) } catch { return s }
    }, 0)
  }

  const totalAportado   = sumAmount(addToCdiLogs)
  const totalAntecipado = sumAmount(antLogs)

  // Build export URL preserving current filters
  const exportParams = new URLSearchParams()
  if (from) exportParams.set('from', from)
  if (to) exportParams.set('to', to)
  if (actionFilter) exportParams.set('action', actionFilter)
  const exportUrl = `/api/admin/conciliacao/export?${exportParams.toString()}`

  // Build filter URL helper
  function filterUrl(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (from) sp.set('from', from)
    if (to) sp.set('to', to)
    if (actionFilter) sp.set('action', actionFilter)
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); else sp.delete(k) })
    sp.delete('page')
    return `/admin/conciliacao?${sp.toString()}`
  }

  const hasFilters = !!(from || to || actionFilter)

  return (
    <div>
      <Topbar
        title="Conciliação"
        breadcrumb="Casa › Relatórios"
        subtitle="Registro auditável de todas as operações financeiras"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Registros no período', value: `${total.toLocaleString('pt-BR')}`,          color: 'text-white',       border: 'border-slate-800/70' },
            { label: 'Aportes CDI',          value: `R$ ${formatBRL(totalAportado)}`,            color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Antecipações Aprov.',  value: `R$ ${formatBRL(totalAntecipado)}`,          color: 'text-blue-400',    border: 'border-blue-500/20' },
            { label: 'Saques Solicitados',   value: `${withdrawLogs.length.toLocaleString('pt-BR')}`, color: 'text-amber-400',   border: 'border-amber-500/20' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Filters */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
          <form method="GET" action="/admin/conciliacao" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">De</label>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[13px] text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Até</label>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[13px] text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Tipo</label>
              <select
                name="action"
                defaultValue={actionFilter}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[13px] text-white focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 min-w-[200px]"
              >
                <option value="">Todos os tipos</option>
                {ACTION_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {Object.entries(actionMeta)
                      .filter(([, v]) => v.group === group)
                      .map(([key, v]) => (
                        <option key={key} value={key}>{v.label}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 ml-auto">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg transition-colors"
              >
                Filtrar
              </button>
              {hasFilters && (
                <Link
                  href="/admin/conciliacao"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[13px] font-semibold rounded-lg transition-colors"
                >
                  Limpar
                </Link>
              )}
              <a
                href={exportUrl}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white text-[13px] font-semibold rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar CSV
              </a>
            </div>
          </form>
        </section>

        {/* Log table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Audit Log</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {total === 0 ? 'Nenhum registro' : `${total.toLocaleString('pt-BR')} registros — página ${page} de ${totalPages}`}
              </p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <p className="text-[13px] font-medium">Nenhum registro encontrado</p>
              {hasFilters && (
                <Link href="/admin/conciliacao" className="mt-2 text-[12px] text-blue-500 hover:text-blue-400">
                  Limpar filtros
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {['Ação', 'Merchant', 'Usuário', 'Detalhes', 'Data'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {logs.map((log) => {
                      const meta = actionMeta[log.action] ?? { label: log.action, dot: 'bg-slate-600' }
                      let details = ''
                      try {
                        const m = JSON.parse(log.metadata ?? '{}')
                        if (m.amount) details = `R$ ${formatBRL(parseFloat(m.amount))}`
                        else if (m.rate) details = `${m.rate}%/mês`
                        else if (m.newStatus) details = `→ ${m.newStatus}`
                        else if (m.status) details = m.status
                      } catch {}
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                              <span className="text-[13px] text-slate-300 font-semibold">{meta.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-[12px] text-slate-400 truncate max-w-[140px]">
                            {log.user?.merchant?.name ?? (log.entityId ?? log.id).slice(0, 8) + '…'}
                          </td>
                          <td className="px-4 py-3.5 text-[12px] text-slate-500 truncate max-w-[140px]">
                            {log.user?.name ?? log.user?.email ?? log.userId.slice(0, 8) + '…'}
                          </td>
                          <td className="px-4 py-3.5 text-[12px] text-slate-500 font-mono">{details || '—'}</td>
                          <td className="px-4 py-3.5 text-[12px] text-slate-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">
                    Mostrando {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} de {total.toLocaleString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-2">
                    {page > 1 && (
                      <Link
                        href={filterUrl({ page: String(page - 1) })}
                        className="px-3 py-1.5 text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
                      >
                        ← Anterior
                      </Link>
                    )}
                    <span className="text-[12px] text-slate-500 font-mono">{page} / {totalPages}</span>
                    {page < totalPages && (
                      <Link
                        href={filterUrl({ page: String(page + 1) })}
                        className="px-3 py-1.5 text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
                      >
                        Próxima →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

      </div>
    </div>
  )
}
