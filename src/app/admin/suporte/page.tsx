export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { TicketActions } from './TicketActions'

function formatDate(d: Date) {
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

const subjectColor: Record<string, string> = {
  'Dúvida sobre saque':              'text-amber-400  bg-amber-500/10  border-amber-500/20',
  'Problema com CDI':                'text-blue-400   bg-blue-500/10   border-blue-500/20',
  'Antecipação de recebíveis':       'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Integração / API':                'text-cyan-400   bg-cyan-500/10   border-cyan-500/20',
  'Verificação de conta (KYC)':      'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Upgrade de plano':                'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Outro':                           'text-slate-400  bg-slate-700/40  border-slate-700/40',
}

const PAGE_SIZE = 25

interface PageProps { searchParams: { page?: string; tab?: string } }

export default async function AdminSuportePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const page    = Math.max(1, parseInt(searchParams.page ?? '1'))
  const tab     = searchParams.tab ?? 'abertos'

  const [allTickets, respondidos] = await Promise.all([
    prisma.auditLog.findMany({
      where: { action: 'SUPPORT_TICKET' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, merchant: { select: { id: true, name: true, plan: true } } } } },
    }).catch(() => []),
    prisma.auditLog.findMany({
      where: { action: 'SUPPORT_TICKET_REPLIED' },
      select: { metadata: true },
    }).catch(() => []),
  ])

  const tickets = allTickets

  const respondidoIds = new Set<string>()
  for (const r of respondidos) {
    try { const m = JSON.parse(r.metadata ?? '{}'); if (m.ticketId) respondidoIds.add(m.ticketId) } catch {}
  }

  const allPendentes = tickets.filter((t) => !respondidoIds.has(t.id))
  const allFechados  = tickets.filter((t) => respondidoIds.has(t.id))

  const lista = tab === 'respondidos' ? allFechados : allPendentes
  const totalPages = Math.ceil(lista.length / PAGE_SIZE)
  const pendentes  = allPendentes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const fechados   = allFechados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <Topbar
        title="Central de Suporte"
        breadcrumb="Casa › Gestão"
        subtitle={`${allPendentes.length} ticket${allPendentes.length !== 1 ? 's' : ''} aberto${allPendentes.length !== 1 ? 's' : ''} · ${allFechados.length} respondido${allFechados.length !== 1 ? 's' : ''}`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total de Tickets',  value: tickets.length,        color: 'text-white',        border: 'border-slate-800/70' },
            { label: 'Aguardando',        value: allPendentes.length,   color: 'text-amber-400',    border: 'border-amber-500/20' },
            { label: 'Respondidos',       value: allFechados.length,    color: 'text-emerald-400',  border: 'border-emerald-500/20' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Pendentes */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Tickets Abertos</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Aguardando resposta da equipe</p>
            </div>
            {pendentes.length > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum ticket pendente</p>
              <p className="text-[11px] text-slate-800 mt-1">Todos os tickets foram respondidos.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {pendentes.map((ticket, i) => {
                let subject = '', message = '', sellerName = '', plano = ''
                try {
                  const m = JSON.parse(ticket.metadata ?? '{}')
                  subject    = m.subject    ?? ''
                  message    = m.message    ?? ''
                  sellerName = m.sellerName ?? ticket.user?.merchant?.name ?? ticket.user?.name ?? '?'
                  plano      = ticket.user?.merchant?.plan ?? ''
                } catch {}
                const badgeClass = subjectColor[subject] ?? subjectColor['Outro']
                const merchantId = ticket.user?.merchant?.id
                return (
                  <div key={ticket.id} className="px-5 py-4 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5`}>
                        {getInitials(sellerName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-[13px] font-semibold text-white">{sellerName}</p>
                          {plano && (
                            <span className="text-[9.5px] font-bold text-slate-500 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded">{plano}</span>
                          )}
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>{subject || 'Outro'}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{ticket.user?.email ?? '—'}</p>
                        <p className="text-[12px] text-slate-400 mt-2 leading-relaxed line-clamp-3">{message}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-[10px] text-slate-700">{formatDate(ticket.createdAt)}</p>
                          {merchantId && (
                            <a href={`/admin/clientes/${merchantId}`} className="text-[10px] text-blue-500 hover:text-blue-400 transition-colors">
                              Ver empresa →
                            </a>
                          )}
                        </div>
                      </div>
                      <TicketActions ticketId={ticket.id} sellerName={sellerName} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Respondidos */}
        {fechados.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Respondidos</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{fechados.length} ticket{fechados.length !== 1 ? 's' : ''} concluído{fechados.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {fechados.map((ticket, i) => {
                let subject = '', sellerName = '', plano = ''
                try {
                  const m = JSON.parse(ticket.metadata ?? '{}')
                  subject    = m.subject    ?? ''
                  sellerName = m.sellerName ?? ticket.user?.merchant?.name ?? ticket.user?.name ?? '?'
                  plano      = ticket.user?.merchant?.plan ?? ''
                } catch {}
                const badgeClass = subjectColor[subject] ?? subjectColor['Outro']
                return (
                  <div key={ticket.id} className="px-5 py-3.5 flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                      {getInitials(sellerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-slate-300 truncate">{sellerName}</p>
                        {plano && <span className="text-[11px] font-semibold text-slate-500 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded">{plano}</span>}
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>{subject || 'Outro'}</span>
                      </div>
                      <p className="text-[12px] text-slate-600 mt-0.5">{formatDate(ticket.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      Respondido
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[12px] text-slate-500">
            <span>Página {page} de {totalPages} · {lista.length} ticket{lista.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?tab=${tab}&page=${page - 1}`} className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-300">← Anterior</a>
              )}
              {page < totalPages && (
                <a href={`?tab=${tab}&page=${page + 1}`} className="px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-slate-300">Próxima →</a>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
