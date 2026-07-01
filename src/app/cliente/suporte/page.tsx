export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { SupportForm } from './SupportForm'
import { TicketConversation } from './TicketConversation'
import { FaqSearch } from './FaqSearch'

// Seller-friendly status labels — no internal jargon
const STATUS_LABELS: Record<string, string> = {
  ABERTO:             'Aguardando atendimento',
  EM_ANALISE:         'Em análise',
  AGUARDANDO_CLIENTE: 'Aguardando sua resposta',
  RESPONDIDO:         'Respondido',
  FECHADO:            'Encerrado',
  REABERTO:           'Em atendimento',
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO:             'text-amber-400  bg-amber-500/10  border-amber-500/20',
  EM_ANALISE:         'text-blue-400   bg-blue-500/10   border-blue-500/20',
  AGUARDANDO_CLIENTE: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  RESPONDIDO:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  FECHADO:            'text-slate-500  bg-slate-700/30  border-slate-700/30',
  REABERTO:           'text-blue-400   bg-blue-500/10   border-blue-500/20',
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

interface PageProps { searchParams: { tab?: string } }

export default async function SuportePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const plano = user?.merchant?.plan ?? 'Start'
  const tab   = (searchParams.tab ?? 'chamado') as 'chamado' | 'historico' | 'ajuda'

  // Load data based on active tab
  const [myTickets, faqItems] = await Promise.all([
    user?.merchant && (tab === 'historico')
      ? prisma.ticket.findMany({
          where:    { merchantId: user.merchant.id },
          orderBy:  { updatedAt: 'desc' },
          take:     30,
          include: {
            messages: {
              where:   { isInternalNote: false },  // seller never sees internal notes
              orderBy: { createdAt: 'asc' },
              select:  { id: true, senderRole: true, message: true, createdAt: true },
            },
          },
        })
      : [],
    tab === 'ajuda'
      ? prisma.faqItem.findMany({
          where:   { isActive: true },
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
        })
      : [],
  ])

  const openTickets   = myTickets.filter((t) => t.status !== 'FECHADO')
  const closedTickets = myTickets.filter((t) => t.status === 'FECHADO')

  const canais = [
    {
      label: 'E-mail',
      value: 'suporte@masterpagamentos.com.br',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      active: true,
    },
    {
      label: 'Chat ao vivo',
      value: plano === 'Start' ? 'Disponível a partir do Growth' : 'Online agora',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
      active: plano !== 'Start',
    },
    {
      label: 'Gerente de conta',
      value: plano === 'Prime' || plano === 'Black' ? 'Disponível para você' : 'Planos Prime e Black',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      active: plano === 'Prime' || plano === 'Black',
    },
  ]

  const TABS = [
    { key: 'chamado',   label: 'Abrir Chamado' },
    { key: 'historico', label: `Meus Chamados${myTickets.length === 0 && tab === 'historico' ? '' : ''}` },
    { key: 'ajuda',     label: 'Ajuda / FAQ' },
  ] as const

  return (
    <div>
      <Topbar
        showNotifications
        title="Suporte"
        breadcrumb="Minha Conta"
        subtitle="Atendimento e central de ajuda"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Canais de atendimento */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {canais.map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border rounded-xl p-4 ${c.active ? 'border-slate-800/70' : 'border-slate-800/40 opacity-50'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${c.active ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800/40 text-slate-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
              <p className="text-[12.5px] font-semibold text-white mb-0.5">{c.label}</p>
              <p className={`text-[11px] ${c.active ? 'text-slate-400' : 'text-slate-600'}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800/70 rounded-xl p-1 w-fit">
          {TABS.map(({ key, label }) => (
            <a
              key={key}
              href={`?tab=${key}`}
              className={`px-4 py-2 rounded-lg text-[11.5px] font-semibold transition-colors ${
                tab === key ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* ── Tab: Abrir Chamado ── */}
        {tab === 'chamado' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800/60">
                <p className="text-[13px] font-semibold text-white">Novo Chamado</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">SLA {plano === 'Black' ? '2h' : plano === 'Prime' ? '4h' : '8h'} úteis · Plano {plano}</p>
              </div>
              <SupportForm plano={plano} />
            </div>

            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 space-y-4">
              <p className="text-[13px] font-semibold text-white">Como funciona o suporte?</p>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Preencha o formulário com a categoria e uma descrição detalhada do problema.' },
                  { step: '2', text: 'Nossa equipe receberá o chamado e iniciará a análise dentro do prazo do seu SLA.' },
                  { step: '3', text: 'Você será notificado quando houver resposta. Pode acompanhar em "Meus Chamados".' },
                  { step: '4', text: 'Responda ou encerre o chamado diretamente pela plataforma.' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-[12px] text-slate-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3">
                <p className="text-[10.5px] font-semibold text-slate-500 mb-2">Horário de Atendimento</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate-600 text-[10px]">Formulário / E-mail</p>
                    <p className="text-slate-300 font-semibold">24/7 · SLA em h úteis</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-[10px]">Chat / Gerente</p>
                    <p className="text-slate-300 font-semibold">Seg–Sex, 09h–18h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Meus Chamados ── */}
        {tab === 'historico' && (
          <div className="space-y-4">
            {myTickets.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-[13px] font-medium">Nenhum chamado aberto ainda</p>
                <a href="?tab=chamado" className="mt-2 text-[11.5px] text-blue-400 hover:text-blue-300 font-semibold">
                  Abrir primeiro chamado →
                </a>
              </div>
            ) : (
              <>
                {openTickets.length > 0 && (
                  <TicketGroup
                    title="Chamados ativos"
                    tickets={openTickets}
                    sellerName={user?.name ?? 'Você'}
                  />
                )}
                {closedTickets.length > 0 && (
                  <TicketGroup
                    title="Chamados encerrados"
                    tickets={closedTickets}
                    sellerName={user?.name ?? 'Você'}
                    muted
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Ajuda / FAQ ── */}
        {tab === 'ajuda' && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-white">Perguntas Frequentes</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Respostas rápidas para as dúvidas mais comuns</p>
            </div>
            <FaqSearch items={faqItems.map((f) => ({
              id:       f.id,
              question: f.question,
              answer:   f.answer,
              category: f.category,
            }))} />
            <div className="mt-6 pt-4 border-t border-slate-800/40 text-center">
              <p className="text-[11.5px] text-slate-600">
                Não encontrou o que precisava?{' '}
                <a href="?tab=chamado" className="text-blue-400 hover:text-blue-300 font-semibold">
                  Abrir um chamado →
                </a>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── TicketGroup helper ─────────────────────────────────────────────────────────

interface TicketGroupProps {
  title:      string
  tickets:    Array<{
    id: string
    subject: string
    category: string
    status: string
    updatedAt: Date
    messages: Array<{ id: string; senderRole: string; message: string; createdAt: Date }>
  }>
  sellerName: string
  muted?:     boolean
}

function TicketGroup({ title, tickets, sellerName, muted }: TicketGroupProps) {
  return (
    <section className={`bg-slate-900/60 border rounded-xl overflow-hidden ${muted ? 'border-slate-800/40' : 'border-slate-800/70'}`}>
      <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
        <p className={`text-[12.5px] font-semibold ${muted ? 'text-slate-600' : 'text-white'}`}>{title}</p>
        <span className="text-[10px] text-slate-700">{tickets.length} chamado{tickets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="divide-y divide-slate-800/40">
        {tickets.map((ticket) => {
          const protocol   = '#' + ticket.id.slice(-8).toUpperCase()
          const statusColor = STATUS_COLORS[ticket.status] ?? STATUS_COLORS['ABERTO']
          const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status
          const isClosed    = ticket.status === 'FECHADO'
          const hasNewReply = ticket.messages.some((m) => m.senderRole === 'ADMIN')

          return (
            <div key={ticket.id} className="px-5 py-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-600">{protocol}</span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {statusLabel}
                    </span>
                    {ticket.status === 'AGUARDANDO_CLIENTE' && (
                      <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full animate-pulse">
                        Ação necessária
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-semibold text-white">{ticket.subject}</p>
                  <p className="text-[10.5px] text-slate-600">{ticket.category}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-slate-700">{formatDate(ticket.updatedAt)}</p>
                  {hasNewReply && !isClosed && (
                    <span className="text-[9px] font-semibold text-emerald-400">● Nova resposta</span>
                  )}
                </div>
              </div>

              {/* Conversation toggle */}
              <TicketConversation
                ticketId={ticket.id}
                messages={ticket.messages.map((m) => ({
                  ...m,
                  createdAt: m.createdAt.toISOString(),
                }))}
                isClosed={isClosed}
                sellerName={sellerName}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
