export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'

export default async function AdminIntegracoesPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const integrations = [
    {
      name: 'API REST',
      status: 'Ativo',
      version: 'v1.4.2',
      statusColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      desc: 'API RESTful para integração com sistemas externos. Suporta criação de transações, consulta de saldo e webhooks.',
      endpoints: 12,
      icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    },
    {
      name: 'Webhook Engine',
      status: 'Ativo',
      version: 'v2.1.0',
      statusColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      desc: 'Motor de webhooks para notificação assíncrona de eventos. Retry automático com backoff exponencial.',
      endpoints: 6,
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
      name: 'BAAS (Banking as a Service)',
      status: 'Em breve',
      version: '—',
      statusColor: 'bg-slate-700/40 text-slate-500 border-slate-700/40',
      desc: 'Integração bancária completa com geração de contas, Pix, TED e boletos. Disponível em breve.',
      endpoints: 0,
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    },
    {
      name: 'Adquirentes',
      status: 'Em breve',
      version: '—',
      statusColor: 'bg-slate-700/40 text-slate-500 border-slate-700/40',
      desc: 'Conexões com adquirentes de cartão (Cielo, Stone, Rede). Suporte a crédito, débito e parcelamento.',
      endpoints: 0,
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    },
  ]

  const health = [
    { label: 'API Uptime (30d)', value: '99.97%', color: 'text-emerald-400' },
    { label: 'Latência média', value: '42ms', color: 'text-emerald-400' },
    { label: 'Webhooks entregues', value: '99.1%', color: 'text-blue-400' },
    { label: 'Erros (7d)', value: '0.03%', color: 'text-slate-300' },
  ]

  return (
    <div>
      <Topbar
        title="Integrações / API"
        breadcrumb="Casa › Gestão"
        subtitle="Status dos serviços e integrações ativas"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Health */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {health.map((h) => (
            <div key={h.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{h.label}</p>
              <p className={`text-[22px] font-bold tabular-nums ${h.color}`}>{h.value}</p>
            </div>
          ))}
        </section>

        {/* Integrations */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {integrations.map((integ) => (
            <div key={integ.name} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/60 text-slate-400 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={integ.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-none">{integ.name}</p>
                    <p className="text-[10.5px] text-slate-600 mt-0.5">Versão {integ.version}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${integ.statusColor}`}>
                  {integ.status}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">{integ.desc}</p>
              {integ.endpoints > 0 && (
                <p className="text-[10.5px] text-slate-700 mt-2">{integ.endpoints} endpoints disponíveis</p>
              )}
            </div>
          ))}
        </section>

        {/* Base URL */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[13px] font-semibold text-white mb-2">Endpoint Base da API</p>
          <code className="text-[12px] font-mono text-blue-300 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/40 block">
            https://api.masterpagamentos.com.br/v1
          </code>
          <p className="text-[10.5px] text-slate-600 mt-2">
            Todas as requisições devem incluir o header <code className="font-mono text-slate-400">Authorization: Bearer {'<API_KEY>'}</code>
          </p>
        </section>

      </div>
    </div>
  )
}
