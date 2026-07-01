export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { TicketActions } from './TicketActions'
import { SupportFilters } from './SupportFilters'
import { getSlaStatus } from '@/lib/sla'
import type { Prisma } from '@prisma/client'

function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const AVATARS = [
  'from-blue-500 to-blue-700', 'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700', 'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600', 'from-cyan-500 to-cyan-700',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Dúvida sobre saque':        'text-amber-400  bg-amber-500/10  border-amber-500/20',
  'Problema com CDI':          'text-blue-400   bg-blue-500/10   border-blue-500/20',
  'Antecipação de recebíveis': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Integração / API':          'text-cyan-400   bg-cyan-500/10   border-cyan-500/20',
  'Verificação de conta (KYC)':'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Upgrade de plano':          'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Outro':                     'text-slate-400  bg-slate-700/40  border-slate-700/40',
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO:             'text-amber-400  bg-amber-500/10  border-amber-500/20',
  EM_ANALISE:         'text-blue-400   bg-blue-500/10   border-blue-500/20',
  AGUARDANDO_CLIENTE: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  RESPONDIDO:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  FECHADO:            'text-slate-500  bg-slate-700/30  border-slate-700/30',
  REABERTO:           'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANALISE: 'Em análise', AGUARDANDO_CLIENTE: 'Aguard.',
  RESPONDIDO: 'Respondido', FECHADO: 'Fechado', REABERTO: 'Reaberto',
}

const PRIORITY_COLORS: Record<string, string> = {
  BAIXA: 'text-slate-400 border-slate-700/40', MEDIA: 'text-blue-400 border-blue-500/30',
  ALTA: 'text-amber-400 border-amber-500/30',  URGENTE: 'text-red-400 border-red-500/30',
}

const OPEN_STATUSES   = ['ABERTO', 'REABERTO', 'EM_ANALISE', 'AGUARDANDO_CLIENTE']
const PAGE_SIZE = 30

const FIXED_CATEGORIES = [
  'Dúvida sobre saque', 'Problema com CDI', 'Antecipação de recebíveis',
  'Integração / API', 'Verificação de conta (KYC)', 'Upgrade de plano', 'Outro',
]

interface PageProps {
  searchParams: {
    page?: string; tab?: string; q?: string; status?: string; priority?: string
    category?: string; assignedTo?: string; plan?: string; from?: string; to?: string
  }
}

export default async function AdminSuportePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const currentAdminId   = (session?.user as any)?.id   as string
  const currentAdminName = (session?.user as any)?.name as string

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const tab  = (searchParams.tab ?? 'abertos') as 'abertos' | 'respondidos' | 'fechados'

  // Tab-based status bucket
  const TAB_STATUSES: Record<string, string[]> = {
    abertos:     OPEN_STATUSES,
    respondidos: ['RESPONDIDO'],
    fechados:    ['FECHADO'],
  }
  const tabStatuses = TAB_STATUSES[tab] ?? TAB_STATUSES['abertos']

  // Build Prisma where clause from filters
  const now       = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)

  const where: Prisma.TicketWhereInput = {
    // Status: explicit filter overrides tab bucket
    status: searchParams.status
      ? searchParams.status
      : { in: tabStatuses },
    ...(searchParams.priority  && { priority: searchParams.priority }),
    ...(searchParams.category  && { category: searchParams.category }),
    ...(searchParams.assignedTo === '__none__'
      ? { assignedTo: null }
      : searchParams.assignedTo
      ? { assignedTo: searchParams.assignedTo }
      : {}),
    ...(searchParams.plan && { merchant: { plan: searchParams.plan } }),
    ...(searchParams.q && {
      OR: [
        { merchant: { name: { contains: searchParams.q, mode: 'insensitive' } } },
        { subject: { contains: searchParams.q, mode: 'insensitive' } },
        { user:     { name: { contains: searchParams.q, mode: 'insensitive' } } },
      ],
    }),
    ...((searchParams.from || searchParams.to) && {
      createdAt: {
        ...(searchParams.from && { gte: new Date(searchParams.from) }),
        ...(searchParams.to   && { lte: new Date(searchParams.to + 'T23:59:59.999Z') }),
      },
    }),
  }

  const [
    kpiAbertos,
    kpiEmAnalise,
    kpiVencidos,
    kpiRespondidosHoje,
    totalFiltered,
    ticketList,
    adminList,
    allCategories,
  ] = await Promise.all([
    // KPIs (always global, ignoring filters)
    prisma.ticket.count({ where: { status: { in: ['ABERTO', 'REABERTO'] } } }),
    prisma.ticket.count({ where: { status: { in: ['EM_ANALISE', 'AGUARDANDO_CLIENTE'] } } }),
    prisma.ticket.count({ where: { slaDueAt: { lt: now }, status: { notIn: ['FECHADO'] } } }),
    prisma.ticket.count({ where: { status: 'RESPONDIDO', updatedAt: { gte: todayStart } } }),
    // Filtered count for pagination
    prisma.ticket.count({ where }),
    // Ticket list with minimal includes (no messages in list view)
    prisma.ticket.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        merchant: { select: { id: true, name: true, plan: true } },
        user:     { select: { id: true, name: true, email: true } },
        // Only fetch messages when opening Gerenciar — but we need them for TicketActions
        // Fetch public + internal for admin panel (internal filtered client-side)
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, senderId: true, senderRole: true, message: true, isInternalNote: true, createdAt: true },
        },
      },
    }),
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true } }),
    // Distinct categories from existing tickets (merged with fixed list)
    prisma.ticket.findMany({ select: { category: true }, distinct: ['category'] }).then(
      (rows) => {
        const set = new Set(FIXED_CATEGORIES)
        rows.forEach((r) => set.add(r.category))
        return Array.from(set)
      }
    ),
  ])

  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE)
  const hasFilters = !!(
    searchParams.q || searchParams.status || searchParams.priority ||
    searchParams.category || searchParams.assignedTo || searchParams.plan ||
    searchParams.from || searchParams.to
  )

  const tabCounts = {
    abertos:     await prisma.ticket.count({ where: { status: { in: TAB_STATUSES['abertos'] } } }),
    respondidos: await prisma.ticket.count({ where: { status: { in: TAB_STATUSES['respondidos'] } } }),
    fechados:    await prisma.ticket.count({ where: { status: { in: TAB_STATUSES['fechados'] } } }),
  }

  return (
    <div>
      <Topbar
        title="Central de Suporte"
        breadcrumb="Casa › Gestão"
        subtitle={`${kpiAbertos} aberto${kpiAbertos !== 1 ? 's' : ''} · ${kpiEmAnalise} em análise · ${kpiVencidos} vencido${kpiVencidos !== 1 ? 's' : ''}`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Em aberto',        value: kpiAbertos,          color: 'text-amber-400',   border: 'border-amber-500/20',   dot: 'bg-amber-400'   },
            { label: 'Em análise',       value: kpiEmAnalise,        color: 'text-blue-400',    border: 'border-blue-500/20',    dot: 'bg-blue-400'    },
            { label: 'SLA vencido',      value: kpiVencidos,         color: 'text-red-400',     border: 'border-red-500/20',     dot: 'bg-red-400'     },
            { label: 'Respondidos hoje', value: kpiRespondidosHoje,  color: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 flex items-start gap-3`}>
              <span className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 shrink-0`} />
              <div>
                <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
                <p className={`text-[26px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Tabs + Filters */}
        <div className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/60 border border-slate-800/70 rounded-xl p-1 w-fit">
            {([
              ['abertos',     `Abertos (${tabCounts.abertos})`],
              ['respondidos', `Respondidos (${tabCounts.respondidos})`],
              ['fechados',    `Fechados (${tabCounts.fechados})`],
            ] as const).map(([t, label]) => (
              <a
                key={t}
                href={`?tab=${t}&page=1`}
                className={`px-4 py-2 rounded-lg text-[11.5px] font-semibold transition-colors ${
                  tab === t ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Filters */}
          <SupportFilters adminList={adminList} categories={allCategories} />
        </div>

        {/* Table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-semibold text-white">
                {hasFilters ? 'Resultados filtrados' : tab === 'abertos' ? 'Tickets em aberto' : tab === 'respondidos' ? 'Respondidos' : 'Fechados'}
              </p>
              {kpiAbertos > 0 && tab === 'abertos' && !hasFilters && (
                <span className="flex items-center gap-1 text-[9.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                  </span>
                  {kpiAbertos} pendente{kpiAbertos !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-600">
              {totalFiltered} ticket{totalFiltered !== 1 ? 's' : ''}
              {hasFilters ? ' encontrado' : ''}
              {totalFiltered !== 1 && hasFilters ? 's' : ''}
            </p>
          </div>

          {ticketList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">{hasFilters ? 'Nenhum resultado para os filtros aplicados' : 'Nenhum ticket nesta aba'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_160px_110px_110px_80px_110px_120px_100px_auto] gap-0 px-5 py-2 border-b border-slate-800/40 min-w-[1050px]">
                {['Seller', 'Assunto', 'Categoria', 'Status', 'Pri.', 'SLA', 'Responsável', 'Atualizado', ''].map((h, i) => (
                  <p key={i} className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-wider pr-3">{h}</p>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-800/30">
                {ticketList.map((ticket, i) => {
                  const sellerName    = ticket.merchant?.name ?? ticket.user?.name ?? '?'
                  const catColor      = CATEGORY_COLORS[ticket.category] ?? CATEGORY_COLORS['Outro']
                  const slaStatus     = getSlaStatus(ticket.slaDueAt, ticket.status)
                  const assignedAdmin = adminList.find((a) => a.id === ticket.assignedTo)

                  return (
                    <div key={ticket.id} className="grid grid-cols-[1fr_160px_110px_110px_80px_110px_120px_100px_auto] gap-0 px-5 py-3 hover:bg-slate-800/20 transition-colors items-start min-w-[1050px]">

                      {/* Seller */}
                      <div className="flex items-center gap-2 pr-3 min-w-0">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${AVATARS[i % AVATARS.length]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                          {getInitials(sellerName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-white truncate">{sellerName}</p>
                          {ticket.merchant?.plan && (
                            <span className="text-[9px] font-bold text-slate-500">{ticket.merchant.plan}</span>
                          )}
                        </div>
                      </div>

                      {/* Assunto */}
                      <p className="text-[11px] text-slate-300 truncate pr-3 pt-1">{ticket.subject}</p>

                      {/* Categoria */}
                      <div className="pr-3 pt-1">
                        <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border ${catColor} truncate max-w-full inline-block`}>
                          {ticket.category}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="pr-3 pt-1">
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[ticket.status] ?? ''}`}>
                          {STATUS_LABELS[ticket.status] ?? ticket.status}
                        </span>
                      </div>

                      {/* Prioridade */}
                      <div className="pr-3 pt-1">
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[ticket.priority] ?? ''}`}>
                          {ticket.priority}
                        </span>
                      </div>

                      {/* SLA */}
                      <div className="pr-3 pt-1">
                        {slaStatus === 'overdue' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            SLA vencido
                          </span>
                        )}
                        {slaStatus === 'warning' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            Próx. venc.
                          </span>
                        )}
                        {slaStatus === 'ok' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            No prazo
                          </span>
                        )}
                        {!slaStatus && <span className="text-[9px] text-slate-700">—</span>}
                      </div>

                      {/* Responsável */}
                      <p className="text-[11px] text-slate-500 truncate pr-3 pt-1">
                        {assignedAdmin?.name ?? <span className="text-slate-700">—</span>}
                      </p>

                      {/* Atualizado */}
                      <p className="text-[10px] text-slate-600 pr-3 pt-1 whitespace-nowrap">{fmtDate(ticket.updatedAt)}</p>

                      {/* Gerenciar */}
                      <div className="pl-2">
                        <TicketActions
                          ticketId={ticket.id}
                          sellerName={sellerName}
                          status={ticket.status}
                          priority={ticket.priority}
                          slaDueAt={ticket.slaDueAt?.toISOString() ?? null}
                          assignedTo={ticket.assignedTo}
                          currentAdminId={currentAdminId}
                          currentAdminName={currentAdminName}
                          adminList={adminList}
                          messages={ticket.messages.map((m) => ({
                            ...m,
                            createdAt: m.createdAt.toISOString(),
                          }))}
                        />
                      </div>

                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[11.5px] text-slate-500">
            <span>Página {page} de {totalPages} · {totalFiltered} ticket{totalFiltered !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) }).toString()}`}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-300"
                >
                  ← Anterior
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) }).toString()}`}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-300"
                >
                  Próxima →
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
