export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { CopyButton } from './CopyButton'

export default async function IntegracoesPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const merchantId = merchant?.id ?? '—'
  const apiKey = (merchant as any)?.apiKey ?? '—'
  const webhookSecret = '—'

  const endpoints = [
    { method: 'POST', path: '/v1/transactions', desc: 'Criar nova transação' },
    { method: 'GET',  path: '/v1/transactions/:id', desc: 'Consultar transação' },
    { method: 'GET',  path: '/v1/balance', desc: 'Consultar saldo' },
    { method: 'POST', path: '/v1/withdrawals', desc: 'Solicitar saque' },
    { method: 'GET',  path: '/v1/withdrawals', desc: 'Listar saques' },
  ]

  const methodColor: Record<string, string> = {
    GET:  'bg-blue-500/15 text-blue-400',
    POST: 'bg-emerald-500/15 text-emerald-400',
    PUT:  'bg-amber-500/15 text-amber-400',
    DELETE: 'bg-red-500/15 text-red-400',
  }

  return (
    <div>
      <Topbar
        title="Integrações / API"
        breadcrumb="Minha Conta"
        subtitle="Chaves de acesso e referência da API REST"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Credentials */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Credenciais de Acesso</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Utilize estas chaves para autenticar requisições à API</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {[
              { label: 'Merchant ID',     value: merchantId,    hint: 'Identificador único da sua empresa' },
              { label: 'API Key (Live)',   value: apiKey,        hint: 'Chave para produção — mantenha em segredo' },
              { label: 'Webhook Secret',  value: webhookSecret, hint: 'Para validar eventos recebidos via webhook' },
            ].map((row) => (
              <div key={row.label} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{row.label}</p>
                  <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{row.value}</p>
                  <p className="text-[10px] text-slate-700 mt-0.5">{row.hint}</p>
                </div>
                <CopyButton value={row.value} />
              </div>
            ))}
          </div>
        </section>

        {/* Base URL */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Base URL</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-[12px] font-mono text-blue-300 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/40 truncate">
              https://api.masterpagamentos.com.br
            </code>
            <CopyButton value="https://api.masterpagamentos.com.br" />
          </div>
        </section>

        {/* Authentication example */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Autenticação</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Passe sua API Key no header de cada requisição</p>
          </div>
          <div className="px-5 py-4">
            <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 overflow-x-auto border border-slate-800/40">
{`curl -X GET https://api.masterpagamentos.com.br/v1/balance \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </section>

        {/* Endpoints */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Endpoints disponíveis</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {endpoints.map((ep) => (
              <div key={ep.path} className="px-5 py-3 flex items-center gap-3">
                <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded font-mono ${methodColor[ep.method] ?? 'bg-slate-700/40 text-slate-400'}`}>
                  {ep.method}
                </span>
                <code className="text-[12px] font-mono text-slate-300 flex-1">{ep.path}</code>
                <span className="text-[12px] text-slate-600 hidden sm:block">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Webhook */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[13px] font-semibold text-white mb-1">Webhooks</p>
          <p className="text-[11px] text-slate-500">
            Configure a URL do seu endpoint para receber notificações de eventos como aprovação de pagamentos, saques e atualizações de KYC. Use o Webhook Secret para validar a assinatura HMAC-SHA256 do payload.
          </p>
        </section>

      </div>
    </div>
  )
}
