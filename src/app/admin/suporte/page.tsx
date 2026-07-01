export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { TicketActions } from './TicketActions'
import { getSlaStatus } from '@/lib/sla'

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
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
  'from-cyan-500 to-cyan-700',
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

const STATUS_TAB_FILTER: Record<string, string[]> = {
  abertos:    ['ABERTO', 'REABERTO', 'EM_ANALISE', 'AGUARDANDO_CLIENTE'],
  respondidos:['RESPONDIDO'],
  fechados:   ['FECHADO'],
}

const PAGE_SIZE = 25

interface PageProps { searchParams: { page?: string; tab?: string } }

export default async function AdminSuportePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const tab  = (searchParams.tab ?? 'abertos') as 'abertos' | 'respondidos' | 'fechados'

  const statusFilter = STATUS_TAB_FILTER[tab] ?? STATUS_TAB_FILTER['abertos']

  const currentAdminId   = (session?.user as any)?.id   as string
  const currentAdminName = (session?.user as any)?.name as string

  const [totalAbertos, totalRespondidos, totalFechados, ticketList, adminList] = await Promise.all([
    prisma.ticket.count({ where: { status: { in: STATUS_TAB_FILTER['abertos'] } } }),
    prisma.ticket.count({ where: { status: { in: STATUS_TAB_FILTER['respondidos'] } } }),
    prisma.ticket.count({ where: { status: { in: STATUS_TAB_FILTER['fechados'] } } }),
    prisma.ticket.findMany({
      where: { status: { in: statusFilter } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
      include: {
        merchant: { select: { id: true, name: true, plan: true } },
        user:     { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, senderId: true, senderRole: true, message: true, isInternalNote: true, createdAt: true },
        },
      },
    }),
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true } }),
  ])

  const totalInTab = tab === 'abertos' ? totalAbertos : tab === 'respondidos' ? totalRespondidos : totalFechados
  const totalPages = Math.ceil(totalInTab / PAGE_SIZE)

  const priorityOrder = ['URGENTE', 'ALTA', 'MEDIA', 'BAIXA']

  return (
    <div>
      <Topbar
        title="Central de Suporte"
        breadcrumb="Casa › Gestão"
        subtitle={`${totalAbertos} aberto${totalAbertos !== 1 ? 's' : ''} · ${totalRespondidos} respondido${totalRespondidos !== 1 ? 's' : ''} · ${totalFechados} fechado${totalFechados !== 1 ? 's' : ''}`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Em aberto',    value: totalAbertos,     color: 'text-amber-400',   border: 'border-amber-500/20' },
            { label: 'Respondidos',  value: totalRespondidos, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Fechados',     value: totalFechados,    color: 'text-slate-500',   border: 'border-slate-800/70' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[22px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800/70 rounded-xl p-1 w-fit">
          {([['abertos', `Abertos (${totalAbertos})`], ['respondidos', `Respondidos (${totalRespondidos})`], ['fechados', `Fechados (${totalFechados})`]] as const).map(([t, label]) => (
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

        {/* Ticket list */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white capitalize">
                Tickets {tab === 'abertos' ? 'em aberto' : tab}
              </p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">
                {tab === 'abertos'
                  ? 'Ordenados por prioridade · mais antigos primeiro'
                  : tab === 'respondidos' ? 'Aguardando réplica ou fechamento'
                  : 'Encerrados'}
              </p>
            </div>
            {tab === 'abertos' && totalAbertos > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                {totalAbertos} pendente{totalAbertos !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {ticketList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum ticket nesta aba</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {ticketList.map((ticket, i) => {
                const sellerName  = ticket.merchant?.name ?? ticket.user?.name ?? '?'
                const badgeClass  = CATEGORY_COLORS[ticket.category] ?? CATEGORY_COLORS['Outro']
                const firstMsg    = ticket.messages.find((m) => m.senderRole === 'SELLER' && !m.isInternalNote)
                const publicMsgs  = ticket.messages.filter((m) => !m.isInternalNote)
                const lastReply   = publicMsgs.filter((m) => m.senderRole === 'ADMIN').at(-1)
                const slaStatus   = getSlaStatus(ticket.slaDueAt, ticket.status)
                const assignedAdmin = adminList.find((a) => a.id === ticket.assignedTo)

                return (
                  <div key={ticket.id} className="px-5 py-4 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5`}>
                        {getInitials(sellerName)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-[13px] font-semibold text-white">{sellerName}</p>
                          {ticket.merchant?.plan && (
                            <span className="text-[9.5px] font-bold text-slate-500 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded">
                              {ticket.merchant.plan}
                            </span>
                          )}
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                            {ticket.subject}
                          </span>
                          {/* Compact SLA indicator */}
                          {slaStatus === 'overdue' && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                              SLA vencido
                            </span>
                          )}
                          {slaStatus === 'warning' && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-amber-400 inline-block" />
                              Próx. venc.
                            </span>
                          )}
                          {slaStatus === 'ok' && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />
                              No prazo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-slate-500 truncate">{ticket.user?.email ?? '—'}</p>
                          {assignedAdmin && (
                            <span className="shrink-0 text-[9.5px] text-slate-600">
                              → {assignedAdmin.name}
                            </span>
                          )}
                        </div>

                        {/* First message */}
                        {firstMsg && (
                          <p className="text-[12px] text-slate-400 mt-2 leading-relaxed line-clamp-2">
                            {firstMsg.message}
                          </p>
                        )}

                        {/* Last admin reply preview */}
                        {lastReply && (
                          <div className="mt-2 pl-3 border-l-2 border-emerald-500/30">
                            <p className="text-[10px] text-emerald-500 font-semibold mb-0.5">
                              Última resposta · {formatDate(lastReply.createdAt)}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{lastReply.message}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-[10px] text-slate-700">{formatDate(ticket.createdAt)}</p>
                          <p className="text-[10px] text-slate-700">
                            {publicMsgs.length} mensagem{publicMsgs.length !== 1 ? 's' : ''}
                          </p>
                          {ticket.merchant?.id && (
                            <a
                              href={`/admin/clientes/${ticket.merchant.id}`}
                              className="text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                            >
                              Ver empresa →
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
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
          )}
        </section>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[12px] text-slate-500">
            <span>Página {page} de {totalPages} · {totalInTab} ticket{totalInTab !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?tab=${tab}&page=${page - 1}`} className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-300">
                  ← Anterior
                </a>
              )}
              {page < totalPages && (
                <a href={`?tab=${tab}&page=${page + 1}`} className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-300">
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
