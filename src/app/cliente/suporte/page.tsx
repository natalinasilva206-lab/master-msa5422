export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

const faqs = [
  {
    q: 'Como funciona o CDI Master Pagamentos?',
    a: 'Seu saldo disponível rende automaticamente pela taxa CDI do seu plano, com juros compostos. O rendimento é calculado mensalmente e creditado sem nenhuma ação necessária da sua parte.',
  },
  {
    q: 'Como fazer um saque?',
    a: 'Acesse "Saques" no menu lateral, informe o valor desejado e confirme. O prazo de liquidação depende do seu plano (Start/Growth: 1 dia útil, Prime: mesmo dia, Black: instantâneo).',
  },
  {
    q: 'O que é saldo pendente?',
    a: 'Saldo pendente são valores de transações aprovadas que ainda estão em período de antifraude/compensação. Após o período, são liberados para seu saldo disponível ou CDI.',
  },
  {
    q: 'Como aportar saldo no CDI?',
    a: 'Acesse "CDI e Rendimentos" e clique em "Aportar no CDI". Informe o valor do saldo pendente que deseja mover para o CDI e confirme. O valor começa a render imediatamente.',
  },
  {
    q: 'O que é KYC?',
    a: 'KYC (Know Your Customer) é o processo de verificação de identidade exigido por regulação. Após enviar seus documentos, nossa equipe analisa e aprova sua conta em até 2 dias úteis.',
  },
  {
    q: 'Como integrar a API do Master Pagamentos?',
    a: 'Acesse "Integrações / API" no menu e copie sua API Key. Use-a no header Authorization das requisições. A documentação completa está disponível na seção de endpoints.',
  },
  {
    q: 'Meu plano pode ser alterado?',
    a: 'Sim. Entre em contato com o suporte para solicitar upgrade. A nova taxa CDI começa a valer no próximo ciclo mensal após a aprovação.',
  },
  {
    q: 'Como consultar o histórico de movimentações?',
    a: 'Acesse "Extrato" no menu lateral para ver todas as movimentações da sua conta, incluindo aportes CDI, saques e ajustes de saldo.',
  },
]

export default async function SuportePage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const plano = user?.merchant?.plan ?? 'Start'

  const canais = [
    { label: 'E-mail', value: 'suporte@masterpagamentos.com.br', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', disponivel: true },
    { label: 'Chat ao vivo', value: plano === 'Start' ? 'Disponível a partir do plano Growth' : 'Online agora', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', disponivel: plano !== 'Start' },
    { label: 'Gerente de conta', value: plano === 'Prime' || plano === 'Black' ? 'Disponível para você' : 'Disponível nos planos Prime e Black', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', disponivel: plano === 'Prime' || plano === 'Black' },
  ]

  return (
    <div>
      <Topbar
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
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-white mb-0.5">{c.label}</p>
              <p className={`text-[11px] ${c.disponivel ? 'text-slate-400' : 'text-slate-600'}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Perguntas Frequentes</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Respostas rápidas para as dúvidas mais comuns</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {faqs.map((faq, i) => (
              <div key={i} className="px-5 py-4">
                <p className="text-[12.5px] font-semibold text-slate-200 mb-1.5">{faq.q}</p>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[13px] font-semibold text-white mb-1">Horário de Atendimento</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-[10.5px] text-slate-600">E-mail</p>
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
