export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { AprovacaoRow, type AprovacaoItem } from './AprovacaoRow'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

export default async function AprovacoesPage() {
  const [earlyRequests, earlyResolved, merchants] = await Promise.all([
    prisma.auditLog.findMany({
      where: { action: 'CDI_EARLY_REQUEST' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            merchant: { select: { id: true, name: true, balance: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: ['CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { name: true, merchant: { select: { name: true } } } },
      },
    }),
    prisma.merchant.findMany({ select: { id: true, balance: true } }),
  ])

  // Build resolved set + lock metadata map
  const resolvedIds = new Set<string>()
  const lockMetaByRequest = new Map<string, { amount: number; lockId: string }>()

  for (const log of earlyResolved) {
    try {
      const m = JSON.parse(log.metadata ?? '{}')
      if (m.requestLogId) resolvedIds.add(m.requestLogId)
    } catch {}
  }

  for (const req of earlyRequests) {
    try {
      const m = JSON.parse(req.metadata ?? '{}')
      lockMetaByRequest.set(req.id, { amount: parseFloat(m.amount || 0), lockId: m.lockId ?? '' })
    } catch {}
  }

  // Fetch lock logs to get lock details (amount, expiresAt)
  const lockIds = [...lockMetaByRequest.values()].map((v) => v.lockId).filter(Boolean)
  const lockLogs = lockIds.length
    ? await prisma.auditLog.findMany({ where: { id: { in: lockIds } } })
    : []
  const lockById = new Map(lockLogs.map((l) => {
    try { return [l.id, JSON.parse(l.metadata ?? '{}')] } catch { return [l.id, {}] }
  }))

  const merchantMap = new Map(merchants.map((m) => [m.id, m]))

  // Pending requests
  const pending: AprovacaoItem[] = earlyRequests
    .filter((r) => !resolvedIds.has(r.id))
    .map((r) => {
      const lm = lockMetaByRequest.get(r.id)
      const lock = lm ? lockById.get(lm.lockId) : null
      const merchant = r.user?.merchant
      const cdiBalance = merchantMap.get(merchant?.id ?? '')?.balance ?? merchant?.balance ?? 0
      return {
        id: r.id,
        merchantId: merchant?.id ?? '',
        sellerName: merchant?.name ?? r.user?.name ?? '—',
        sellerEmail: r.user?.email ?? '—',
        amount: lm?.amount ?? 0,
        cdiBalance,
        lockAmount: lock ? parseFloat(lock.amount || 0) : (lm?.amount ?? 0),
        lockExpiresAt: lock?.expiresAt ?? null,
        createdAt: r.createdAt,
      }
    })

  // Recent history (resolved)
  const history = earlyResolved.slice(0, 20).map((log) => {
    let amount = 0, requestLogId = ''
    try { const m = JSON.parse(log.metadata ?? '{}'); amount = parseFloat(m.amount || 0); requestLogId = m.requestLogId ?? '' } catch {}
    return {
      id: log.id,
      action: log.action,
      sellerName: log.user?.merchant?.name ?? log.user?.name ?? '—',
      amount,
      resolvedAt: log.createdAt,
    }
  })

  const totalPending = pending.reduce((s, r) => s + r.amount, 0)
  const approvedToday = earlyResolved.filter((l) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return l.action === 'CDI_EARLY_APPROVED' && new Date(l.createdAt) >= today
  }).length
  const deniedToday = earlyResolved.filter((l) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return l.action === 'CDI_EARLY_DENIED' && new Date(l.createdAt) >= today
  }).length

  return (
    <div>
      <Topbar
        title="Aprovações"
        breadcrumb="Casa › Financeiro"
        subtitle="Solicitações de resgate antecipado de CDI aguardando decisão"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Pendentes',
              value: `${pending.length}`,
              sub: pending.length === 0 ? 'nenhuma pendência' : 'aguardando análise',
              color: pending.length > 0 ? 'text-amber-400' : 'text-slate-500',
              bg: pending.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800/60 text-slate-600',
              border: pending.length > 0 ? 'border-amber-500/20' : 'border-slate-800/70',
              icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              label: 'Volume em análise',
              value: `R$ ${formatBRL(totalPending)}`,
              sub: 'total solicitado',
              color: 'text-white',
              bg: 'bg-slate-800/60 text-slate-500',
              border: 'border-slate-800/70',
              icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
            },
            {
              label: 'Aprovados hoje',
              value: `${approvedToday}`,
              sub: 'resgates liberados',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 text-emerald-500',
              border: 'border-emerald-500/15',
              icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              label: 'Negados hoje',
              value: `${deniedToday}`,
              sub: 'solicitações recusadas',
              color: 'text-red-400',
              bg: 'bg-red-500/10 text-red-500',
              border: 'border-slate-800/70',
              icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 transition-colors`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
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

        {/* Pendentes */}
        <section className={`border rounded-xl overflow-hidden ${pending.length > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/60 border-slate-800/70'}`}>
          <div className={`px-5 py-3.5 border-b flex items-center gap-2.5 ${pending.length > 0 ? 'border-amber-500/15' : 'border-slate-800/60'}`}>
            {pending.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />}
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">Resgates Antecipados Pendentes</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {pending.length > 0
                  ? `${pending.length} solicitação${pending.length !== 1 ? 'ões' : ''} · R$ ${formatBRL(totalPending)} em análise`
                  : 'Nenhuma solicitação aguardando'}
              </p>
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Tudo em dia</p>
              <p className="text-[11px] text-slate-800 mt-1">Nenhuma solicitação de resgate aguardando aprovação.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-amber-500/10">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Título bloqueado</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Saldo CDI</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Valor solicitado</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Decisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {pending.map((item) => <AprovacaoRow key={item.id} item={item} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Histórico */}
        {history.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico de Decisões</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Últimas {history.length} resolucões</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {history.map((h) => (
                <div key={h.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    h.action === 'CDI_EARLY_APPROVED' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    <svg className={`w-3.5 h-3.5 ${h.action === 'CDI_EARLY_APPROVED' ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {h.action === 'CDI_EARLY_APPROVED'
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-200 truncate">{h.sellerName}</p>
                    <p className="text-[10.5px] text-slate-600">{formatDate(h.resolvedAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[12.5px] font-bold tabular-nums ${h.action === 'CDI_EARLY_APPROVED' ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                      R$ {formatBRL(h.amount)}
                    </p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${h.action === 'CDI_EARLY_APPROVED' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {h.action === 'CDI_EARLY_APPROVED' ? 'Aprovado' : 'Negado'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
