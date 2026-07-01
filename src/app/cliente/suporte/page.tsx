export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { SupportForm } from './SupportForm'
import { TicketThread } from './TicketThread'

const faqs = [
  {
    q: 'Como funciona o CDI Master Pagamentos?',
    a: 'Seu saldo disponível rende automaticamente pela taxa CDI do seu plano, com juros compostos. O rendimento é calculado mensalmente e creditado sem nenhuma ação necessária da sua parte.',
  },
  {
    q: 'Como fazer um saque?',
    a: 'Acesse "Saques" no menu lateral, informe o valor e a chave Pix de destino. O prazo de liquidação depende do seu plano (Start/Growth: 1 dia útil, Prime: mesmo dia, Black: instantâneo).',
  },
  {
    q: 'O que é saldo disponível?',
    a: 'Saldo disponível são valores já compensados e livres para saque ou aporte no CDI. É diferente do saldo em CDI, que está rendendo juros.',
  },
  {
    q: 'Como aportar saldo no CDI?',
    a: 'Acesse "CDI e Rendimentos" e clique em "Aportar no CDI". Informe o valor do saldo disponível que deseja mover para o CDI e confirme. O valor começa a render imediatamente.',
  },
  {
    q: 'O que é antecipação de recebíveis?',
    a: 'Permite receber agora os valores de vendas no cartão antes do prazo de liquidação, com desconto de uma taxa conforme seu plano. Disponível exclusivamente para recebíveis de cartão.',
  },
  {
    q: 'O que é KYC?',
    a: 'KYC (Know Your Customer) é o processo de verificação de identidade exigido por regulação. Nossa equipe analisa e aprova sua conta em até 2 dias úteis após o envio dos documentos.',
  },
  {
    q: 'Como integrar a API do Master Pagamentos?',
    a: 'Acesse "Integrações / API" no menu e copie sua API Key. Use-a no header Authorization das requisições.',
  },
  {
    q: 'Meu plano pode ser alterado?',
    a: 'Sim. Entre em contato via o formulário abaixo para solicitar upgrade. A nova taxa CDI começa a valer no próximo ciclo mensal após a aprovação.',
  },
]

const STATUS_LABELS: Record<string, string> = {
  ABERTO:             'Aberto',
  EM_ANALISE:         'Em análise',
  AGUARDANDO_CLIENTE: 'Aguard. resposta',
  RESPONDIDO:         'Respondido',
  FECHADO:            'Fechado',
  REABERTO:           'Reaberto',
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO:             'text-amber-400  bg-amber-500/10  border-amber-500/20',
  EM_ANALISE:         'text-blue-400   bg-blue-500/10   border-blue-500/20',
  AGUARDANDO_CLIENTE: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  RESPONDIDO:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  FECHADO:            'text-slate-500  bg-slate-700/30  border-slate-700/30',
  REABERTO:           'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export default async function SuportePage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const plano = user?.merchant?.plan ?? 'Start'

  const myTickets = user?.merchant
    ? await prisma.ticket.findMany({
        where: { merchantId: user.merchant.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          messages: {
            where: { isInternalNote: false },
            orderBy: { createdAt: 'asc' },
            select: { id: true, senderId: true, senderRole: true, message: true, createdAt: true },
          },
        },
      })
    : []

  const canais = [
    {
      label: 'E-mail',
      value: 'suporte@masterpagamentos.com.br',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      disponivel: true,
    },
    {
      label: 'Chat ao vivo',
      value: plano === 'Start' ? 'Disponível a partir do Growth' : 'Online agora',
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
      disponivel: plano !== 'Start',
    },
    {
      label: 'Gerente de conta',
      value: plano === 'Prime' || plano === 'Black' ? 'Disponível para você' : 'Planos Prime e Black',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      disponivel: plano === 'Prime' || plano === 'Black',
    },
  ]

  return (
    <div>
      <Topbar showNotifications
        title="Suporte"
        breadcrumb="Minha Conta"
        subtitle="Central de ajuda e canais de atendimento"
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* Canais */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {canais.map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border rounded-xl p-4 ${c.disponivel ? 'border-slate-800/70' : 'border-slate-800/40 opacity-60'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.disponivel ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800/40 text-slate-600'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-white mb-0.5">{c.label}</p>
              <p className={`text-[11px] ${c.disponivel ? 'text-slate-400' : 'text-slate-600'}`}>{c.value}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Formulário de contato */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Enviar Mensagem</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Resposta em até 8h úteis · Plano {plano}</p>
            </div>
            <SupportForm plano={plano} />
          </div>

          {/* FAQ */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Perguntas Frequentes</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Respostas rápidas para as dúvidas mais comuns</p>
            </div>
            <div className="divide-y divide-slate-800/40 max-h-[520px] overflow-y-auto">
              {faqs.map((faq, i) => (
                <div key={i} className="px-5 py-4">
                  <p className="text-[12px] font-semibold text-slate-200 mb-1">{faq.q}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Histórico de tickets */}
        {myTickets.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Meus Tickets</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {myTickets.length} ticket{myTickets.length !== 1 ? 's' : ''} · Histórico e respostas do suporte
              </p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {myTickets.map((ticket) => {
                const statusColor = STATUS_COLORS[ticket.status] ?? STATUS_COLORS['ABERTO']
                const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status
                const firstMsg = ticket.messages.find((m) => m.senderRole === 'SELLER')
                const adminReplies = ticket.messages.filter((m) => m.senderRole === 'ADMIN')
                const isClosed = ticket.status === 'FECHADO'
                return (
                  <div key={ticket.id} className="px-5 py-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[12px] font-semibold text-white">{ticket.subject}</span>
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-700">{formatDate(ticket.createdAt)}</p>
                      </div>
                      <p className="shrink-0 text-[10px] text-slate-700">
                        {ticket.messages.length} msg{ticket.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* First message */}
                    {firstMsg && (
                      <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-3">{firstMsg.message}</p>
                    )}

                    {/* Admin replies */}
                    {adminReplies.map((rep) => (
                      <div key={rep.id} className="ml-3 pl-3 border-l-2 border-emerald-500/30 space-y-0.5">
                        <p className="text-[10px] font-semibold text-emerald-400">Suporte Master · {formatDate(rep.createdAt)}</p>
                        <p className="text-[12px] text-slate-300 leading-relaxed">{rep.message}</p>
                      </div>
                    ))}

                    {/* Reply thread */}
                    {!isClosed && <TicketThread ticketId={ticket.id} />}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[13px] font-semibold text-white mb-2">Horário de Atendimento</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10.5px] text-slate-600">E-mail / Formulário</p>
              <p className="text-[12px] text-slate-300 font-semibold">24/7 · SLA 8h úteis</p>
            </div>
            <div>
              <p className="text-[10.5px] text-slate-600">Chat / Gerente</p>
              <p className="text-[12px] text-slate-300 font-semibold">Seg–Sex, 09h–18h</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
